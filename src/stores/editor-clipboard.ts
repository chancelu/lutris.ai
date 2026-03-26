import {
  computeAllLayouts,
  importClipboardNodes,
  parseFigmaClipboard,
  parseOpenPencilClipboard,
  buildFigmaClipboardHTML,
  buildOpenPencilClipboardHTML
} from '@open-pencil/core'

import type { SceneNode, Vector } from '@open-pencil/core'
import type { EditorContext } from './editor-types'

function centerNodesAt(ctx: EditorContext, nodeIds: string[], cx: number, cy: number) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const id of nodeIds) {
    const n = ctx.graph().getNode(id)
    if (!n) continue
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.width)
    maxY = Math.max(maxY, n.y + n.height)
  }
  if (minX === Infinity) return
  const dx = cx - (minX + maxX) / 2
  const dy = cy - (minY + maxY) / 2
  for (const id of nodeIds) {
    const n = ctx.graph().getNode(id)
    if (n) ctx.graph().updateNode(id, { x: n.x + dx, y: n.y + dy })
  }
}

function collectSubtrees(ctx: EditorContext, rootIds: string[]): SceneNode[] {
  const result: SceneNode[] = []
  function walk(id: string) {
    const node = ctx.graph().getNode(id)
    if (!node) return
    result.push({ ...node })
    for (const childId of node.childIds) walk(childId)
  }
  for (const id of rootIds) walk(id)
  return result
}

function warnMissingImages(ctx: EditorContext, nodeIds: string[]) {
  const allNodes = collectSubtrees(ctx, nodeIds)
  const hasMissing = allNodes.some((n) =>
    n.fills.some((f) => f.type === 'IMAGE' && f.imageHash && !ctx.graph().images.has(f.imageHash))
  )
  if (hasMissing) {
    ctx.toast("Some images couldn't be pasted — Figma doesn't include image data in clipboard", 'warning')
  }
}

export function createClipboardOps(ctx: EditorContext) {
  function writeCopyData(clipboardData: DataTransfer) {
    const nodes = ctx.selectedNodes()
    if (nodes.length === 0) return

    const names = nodes.map((n) => n.name).join('\n')
    const renderer = ctx.renderer()
    const textPicBuilder = renderer
      ? (node: SceneNode) => renderer.buildTextPicture(node)
      : undefined
    const internalHtml = buildOpenPencilClipboardHTML(nodes, ctx.graph(), textPicBuilder)
    const figmaHtml = buildFigmaClipboardHTML(nodes, ctx.graph())

    const html = figmaHtml ? figmaHtml + internalHtml : internalHtml
    clipboardData.setData('text/html', html)
    clipboardData.setData('text/plain', names)
  }

  function pasteOpenPencilNodes(
    nodes: Array<SceneNode & { children?: SceneNode[] }>,
    parentId?: string,
    cursorPos?: Vector
  ) {
    const target = parentId ?? ctx.state.currentPageId
    const prevSelection = new Set(ctx.state.selectedIds)
    const newIds: string[] = []
    const created: Array<{ id: string; parentId: string; snapshot: SceneNode }> = []

    let offsetX = 20
    let offsetY = 20
    if (cursorPos && nodes.length > 0) {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const n of nodes) {
        minX = Math.min(minX, n.x)
        minY = Math.min(minY, n.y)
        maxX = Math.max(maxX, n.x + n.width)
        maxY = Math.max(maxY, n.y + n.height)
      }
      offsetX = cursorPos.x - (minX + maxX) / 2
      offsetY = cursorPos.y - (minY + maxY) / 2
    }

    function createTree(src: SceneNode & { children?: SceneNode[] }, pid: string, isTop: boolean) {
      const { id: _srcId, parentId: _srcParent, childIds: _srcChildren, ...rest } = src
      const node = ctx.graph().createNode(src.type, pid, {
        ...rest,
        x: src.x + (isTop ? offsetX : 0),
        y: src.y + (isTop ? offsetY : 0)
      })
      created.push({ id: node.id, parentId: pid, snapshot: { ...node } })
      if (isTop) newIds.push(node.id)
      if (src.children) {
        for (const child of src.children) {
          createTree(child, node.id, false)
        }
      }
    }

    for (const src of nodes) {
      createTree(src, target, true)
    }
    if (newIds.length > 0) {
      ctx.state.selectedIds = new Set(newIds)
      ctx.undo.push({
        label: 'Paste',
        forward: () => {
          for (const { snapshot, parentId: pid } of created) {
            ctx.graph().createNode(snapshot.type, pid, snapshot)
          }
          ctx.state.selectedIds = new Set(newIds)
        },
        inverse: () => {
          for (const { id } of [...created].reverse()) ctx.graph().deleteNode(id)
          ctx.state.selectedIds = prevSelection
        }
      })
    }
  }

  function pasteFromHTML(html: string, cursorPos?: Vector) {
    const own = parseOpenPencilClipboard(html)
    if (own) {
      for (const [hash, data] of own.images) ctx.graph().images.set(hash, data)
      pasteOpenPencilNodes(own.nodes, undefined, cursorPos)
      return
    }

    void parseFigmaClipboard(html).then((figma) => {
      if (figma) {
        const prevSelection = new Set(ctx.state.selectedIds)
        const created = importClipboardNodes(
          figma.nodes,
          ctx.graph(),
          ctx.state.currentPageId,
          0,
          0,
          figma.blobs
        )
        if (created.length > 0) {
          const cx = cursorPos?.x ?? (-ctx.state.panX + window.innerWidth / 2) / ctx.state.zoom
          const cy = cursorPos?.y ?? (-ctx.state.panY + window.innerHeight / 2) / ctx.state.zoom
          centerNodesAt(ctx, created, cx, cy)
          computeAllLayouts(ctx.graph(), ctx.state.currentPageId)
          ctx.state.selectedIds = new Set(created)

          const allNodes = collectSubtrees(ctx, created)
          const pageId = ctx.state.currentPageId
          ctx.undo.push({
            label: 'Paste',
            forward: () => {
              for (const snapshot of allNodes) {
                ctx.graph().createNode(snapshot.type, snapshot.parentId ?? pageId, {
                  ...snapshot,
                  childIds: []
                })
              }
              computeAllLayouts(ctx.graph(), pageId)
              ctx.state.selectedIds = new Set(created)
            },
            inverse: () => {
              for (const id of [...created].reverse()) ctx.graph().deleteNode(id)
              computeAllLayouts(ctx.graph(), pageId)
              ctx.state.selectedIds = prevSelection
            }
          })
          void ctx.loadFontsForNodes(created)
          warnMissingImages(ctx, created)
        }
      }
    })
  }

  function duplicateSelected() {
    const prevSelection = new Set(ctx.state.selectedIds)
    const newIds: string[] = []
    const snapshots: Array<{ id: string; parentId: string; snapshot: SceneNode }> = []

    for (const id of ctx.state.selectedIds) {
      const src = ctx.graph().getNode(id)
      if (!src) continue
      const parentId = src.parentId ?? ctx.state.currentPageId
      const { id: _srcId, parentId: _srcParent, childIds: _srcChildren, ...srcRest } = src
      const node = ctx.graph().createNode(src.type, parentId, {
        ...srcRest,
        name: src.name + ' copy',
        x: src.x + 20,
        y: src.y + 20
      })
      newIds.push(node.id)
      snapshots.push({ id: node.id, parentId, snapshot: { ...node } })
    }

    if (newIds.length > 0) {
      ctx.state.selectedIds = new Set(newIds)
      ctx.undo.push({
        label: 'Duplicate',
        forward: () => {
          for (const { snapshot, parentId } of snapshots) {
            ctx.graph().createNode(snapshot.type, parentId, snapshot)
          }
          ctx.state.selectedIds = new Set(newIds)
        },
        inverse: () => {
          for (const { id } of snapshots) ctx.graph().deleteNode(id)
          ctx.state.selectedIds = prevSelection
        }
      })
    }
  }

  function deleteSelected() {
    const entries: Array<{ id: string; parentId: string; snapshot: SceneNode; index: number }> = []
    for (const id of ctx.state.selectedIds) {
      const node = ctx.graph().getNode(id)
      if (!node) continue
      const parentId = node.parentId ?? ctx.state.currentPageId
      const parent = ctx.graph().getNode(parentId)
      const index = parent?.childIds.indexOf(id) ?? -1
      entries.push({ id, parentId, snapshot: { ...node }, index })
    }
    if (entries.length === 0) return

    const prevSelection = new Set(ctx.state.selectedIds)
    for (const { id } of entries) ctx.graph().deleteNode(id)

    ctx.undo.push({
      label: 'Delete',
      forward: () => {
        for (const { id } of entries) ctx.graph().deleteNode(id)
        ctx.state.selectedIds = new Set()
      },
      inverse: () => {
        for (const { snapshot, parentId, index } of [...entries].reverse()) {
          ctx.graph().createNode(snapshot.type, parentId, snapshot)
          if (index >= 0) {
            ctx.graph().reorderChild(snapshot.id, parentId, index)
          }
        }
        ctx.state.selectedIds = prevSelection
      }
    })
    ctx.state.selectedIds = new Set()
  }

  function mobileCopy() {
    const transfer = new DataTransfer()
    writeCopyData(transfer)
    ctx.state.clipboardHtml = transfer.getData('text/html')
  }

  function mobileCut() {
    mobileCopy()
    deleteSelected()
  }

  function mobilePaste() {
    if (ctx.state.clipboardHtml) {
      pasteFromHTML(ctx.state.clipboardHtml)
    }
  }

  return {
    writeCopyData,
    pasteFromHTML,
    duplicateSelected,
    deleteSelected,
    mobileCopy,
    mobileCut,
    mobilePaste
  }
}
