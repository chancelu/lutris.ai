import type { Rect, SnapGuide } from '@llc3233149/core'
import type { EditorContext, EditorState } from './editor-types'

export function createSelectionOps(ctx: EditorContext) {
  const state = ctx.state

  function select(ids: string[], additive = false) {
    if (additive) {
      const next = new Set(state.selectedIds)
      for (const id of ids) {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      }
      state.selectedIds = next
    } else {
      state.selectedIds = new Set(ids)
    }
  }

  function clearSelection() {
    state.selectedIds = new Set()
  }

  function selectAll() {
    const children = ctx.graph().getChildren(state.currentPageId)
    state.selectedIds = new Set(children.map((n) => n.id))
  }

  function setMarquee(rect: Rect | null) {
    state.marquee = rect
    ctx.requestRepaint()
  }

  function setSnapGuides(guides: SnapGuide[]) {
    state.snapGuides = guides
    ctx.requestRepaint()
  }

  function setRotationPreview(preview: { nodeId: string; angle: number } | null) {
    state.rotationPreview = preview
    ctx.requestRepaint()
  }

  function setHoveredNode(id: string | null) {
    if (state.hoveredNodeId === id) return
    state.hoveredNodeId = id
    ctx.requestRepaint()
  }

  function setDropTarget(id: string | null) {
    state.dropTargetId = id
    ctx.requestRepaint()
  }

  function setLayoutInsertIndicator(indicator: EditorState['layoutInsertIndicator']) {
    state.layoutInsertIndicator = indicator
    ctx.requestRepaint()
  }

  return {
    select,
    clearSelection,
    selectAll,
    setMarquee,
    setSnapGuides,
    setRotationPreview,
    setHoveredNode,
    setDropTarget,
    setLayoutInsertIndicator
  }
}
