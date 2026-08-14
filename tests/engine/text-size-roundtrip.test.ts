import { describe, test, expect, beforeAll } from 'bun:test'

import {
  SceneGraph,
  exportFigFile,
  parseFigFile,
  computeAllLayouts,
  initCodec,
  type SceneNode,
} from '@llc3233149/core'
import { createEditorStore } from '@/stores/editor'

// Regression: AI-generated docs rely on auto-layout frames full of
// textAutoResize='WIDTH_AND_HEIGHT' TEXT nodes. After autosave → reopen the
// TEXT nodes came back at the createNode default 100×100 instead of their
// laid-out size (~fontSize*1.2 tall), which pushed them out of 56px list rows
// and made the text "disappear" behind overflow clipping.

const TEXTS = ['OK', 'In progress items', 'A much longer piece of text content for wrapping']

function collectAllNodes(graph: SceneGraph): SceneNode[] {
  const all: SceneNode[] = []
  function walk(id: string) {
    const node = graph.getNode(id)
    if (!node) return
    all.push(node)
    for (const child of graph.getChildren(id)) {
      walk(child.id)
    }
  }
  for (const page of graph.getPages()) {
    for (const child of graph.getChildren(page.id)) {
      walk(child.id)
    }
  }
  return all
}

describe('text auto-resize size roundtrip', () => {
  const sizeBefore = new Map<string, { width: number; height: number }>()
  let restoredNodes: SceneNode[]

  beforeAll(async () => {
    await initCodec()

    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    const frame = graph.createNode('FRAME', page.id, {
      name: 'List',
      layoutMode: 'VERTICAL',
      itemSpacing: 8,
      paddingTop: 16,
      paddingRight: 16,
      paddingBottom: 16,
      paddingLeft: 16,
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
    })

    TEXTS.forEach((text, i) => {
      graph.createNode('TEXT', frame.id, {
        name: `Label ${i}`,
        text,
        fontSize: 14,
        fontFamily: 'Inter',
        textAutoResize: 'WIDTH_AND_HEIGHT',
      })
    })

    // Non-default textAutoResize values must survive the roundtrip too —
    // serializeTextProps used to hardcode every text to WIDTH_AND_HEIGHT.
    graph.createNode('TEXT', frame.id, {
      name: 'Fixed Height Label',
      text: 'Fixed height',
      width: 120,
      fontSize: 14,
      fontFamily: 'Inter',
      textAutoResize: 'HEIGHT',
    })
    graph.createNode('TEXT', frame.id, {
      name: 'No Resize Label',
      text: 'No resize',
      width: 130,
      height: 20,
      fontSize: 14,
      fontFamily: 'Inter',
      textAutoResize: 'NONE',
    })

    // Headless: no CanvasKit measurer, layout falls back to estimateTextSize
    computeAllLayouts(graph)

    for (const node of collectAllNodes(graph)) {
      if (node.type === 'TEXT') {
        sizeBefore.set(node.name, { width: node.width, height: node.height })
      }
    }

    const figBytes = await exportFigFile(graph)
    const restored = await parseFigFile(figBytes.buffer as ArrayBuffer)
    restoredNodes = collectAllNodes(restored)
  })

  test('layout produces estimated text height before export', () => {
    for (const [name, size] of sizeBefore) {
      if (!name.startsWith('Label ')) continue
      expect(size.height, name).toBeGreaterThan(0)
      expect(size.height, name).toBeCloseTo(14 * 1.2, 0)
      expect(size.width, name).toBeGreaterThan(0)
      expect(size.width, name).not.toBe(100)
    }
  })

  test('restores all text nodes', () => {
    const texts = restoredNodes.filter((n) => n.type === 'TEXT')
    expect(texts.map((n) => n.name).sort()).toEqual(
      [...TEXTS.map((_, i) => `Label ${i}`), 'Fixed Height Label', 'No Resize Label'].sort()
    )
  })

  test('preserves text node dimensions (not 100×100)', () => {
    for (const node of restoredNodes) {
      if (node.type !== 'TEXT') continue
      const before = sizeBefore.get(node.name)!
      expect(before, node.name).toBeDefined()
      expect(node.width, `${node.name} width`).toBeCloseTo(before.width, 5)
      expect(node.height, `${node.name} height`).toBeCloseTo(before.height, 5)
      expect(node.width, `${node.name} width`).not.toBe(100)
      expect(node.height, `${node.name} height`).not.toBe(100)
    }
  })

  test('preserves textAutoResize', () => {
    const expected: Record<string, string> = {
      'Label 0': 'WIDTH_AND_HEIGHT',
      'Label 1': 'WIDTH_AND_HEIGHT',
      'Label 2': 'WIDTH_AND_HEIGHT',
      'Fixed Height Label': 'HEIGHT',
      'No Resize Label': 'NONE',
    }
    for (const node of restoredNodes) {
      if (node.type !== 'TEXT') continue
      expect(node.textAutoResize, node.name).toBe(expected[node.name])
    }
  })
})

// Same scenario through the real app path: EditorStore.buildFigFile()
// (autosave) → new File → EditorStore.openFigFile() (project reopen).
// Rows mimic the AI-generated list: fixed 56px, vertically centered, clipped.
describe('store-level buildFigFile → openFigFile', () => {
  const sizeBefore = new Map<string, { width: number; height: number }>()
  let restoredGraph: SceneGraph

  beforeAll(async () => {
    const store = createEditorStore()
    const graph = store.graph
    const page = graph.getPages()[0]

    const list = graph.createNode('FRAME', page.id, {
      name: 'List',
      layoutMode: 'VERTICAL',
      itemSpacing: 4,
      paddingTop: 8,
      paddingRight: 8,
      paddingBottom: 8,
      paddingLeft: 8,
      primaryAxisSizing: 'HUG',
      counterAxisSizing: 'HUG',
    })

    TEXTS.forEach((text, i) => {
      const row = graph.createNode('FRAME', list.id, {
        name: `Row ${i}`,
        width: 280,
        height: 56,
        layoutMode: 'HORIZONTAL',
        paddingLeft: 12,
        paddingRight: 12,
        counterAxisAlign: 'CENTER',
        primaryAxisSizing: 'FIXED',
        counterAxisSizing: 'FIXED',
        clipsContent: true,
      })
      graph.createNode('TEXT', row.id, {
        name: `Label ${i}`,
        text,
        fontSize: 14,
        fontFamily: 'Inter',
        textAutoResize: 'WIDTH_AND_HEIGHT',
      })
    })

    computeAllLayouts(graph)

    for (const node of collectAllNodes(graph)) {
      if (node.type === 'TEXT') {
        sizeBefore.set(node.name, { width: node.width, height: node.height })
      }
    }

    const figData = await store.buildFigFile()
    const file = new File([figData], 'doc.fig', { type: 'application/octet-stream' })
    await store.openFigFile(file)
    restoredGraph = store.graph
  })

  test('preserves text node dimensions (not 100×100)', () => {
    const texts = collectAllNodes(restoredGraph).filter((n) => n.type === 'TEXT')
    expect(texts.length).toBe(TEXTS.length)
    for (const node of texts) {
      const before = sizeBefore.get(node.name)!
      expect(before, node.name).toBeDefined()
      expect(node.width, `${node.name} width`).toBeCloseTo(before.width, 5)
      expect(node.height, `${node.name} height`).toBeCloseTo(before.height, 5)
      expect(node.width, `${node.name} width`).not.toBe(100)
      expect(node.height, `${node.name} height`).not.toBe(100)
    }
  })

  test('preserves row dimensions and textAutoResize', () => {
    const nodes = collectAllNodes(restoredGraph)
    const rows = nodes.filter((n) => n.name.startsWith('Row '))
    expect(rows.length).toBe(TEXTS.length)
    for (const row of rows) {
      expect(row.height, row.name).toBe(56)
    }
    for (const node of nodes) {
      if (node.type === 'TEXT') {
        expect(node.textAutoResize, node.name).toBe('WIDTH_AND_HEIGHT')
      }
    }
  })
})
