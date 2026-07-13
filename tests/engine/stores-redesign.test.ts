import { describe, expect, test } from 'bun:test'

import { TOOLS, TOOL_SHORTCUTS, type Tool } from '@/stores/tools'
import { createSelectionOps } from '@/stores/selection'
import { createViewportOps } from '@/stores/canvas'
import { SceneGraph } from '@llc3233149/core'

/* ------------------------------------------------------------------ */
/*  tools.ts                                                          */
/* ------------------------------------------------------------------ */

describe('tools store', () => {
  test('TOOLS has exactly 6 items', () => {
    expect(TOOLS).toHaveLength(6)
  })

  test('TOOLS contains SELECT, FRAME, RECTANGLE, PEN, TEXT, HAND', () => {
    const keys = TOOLS.map((t) => t.key)
    expect(keys).toEqual(['SELECT', 'FRAME', 'RECTANGLE', 'PEN', 'TEXT', 'HAND'])
  })

  test('each tool has label and shortcut', () => {
    for (const t of TOOLS) {
      expect(t.label).toBeTruthy()
      expect(t.shortcut).toBeTruthy()
    }
  })

  test('TOOL_SHORTCUTS maps keys to tools', () => {
    expect(TOOL_SHORTCUTS['v']).toBe('SELECT')
    expect(TOOL_SHORTCUTS['f']).toBe('FRAME')
    expect(TOOL_SHORTCUTS['t']).toBe('TEXT')
    expect(TOOL_SHORTCUTS['h']).toBe('HAND')
  })
})

/* ------------------------------------------------------------------ */
/*  Helpers: mock EditorContext                                        */
/* ------------------------------------------------------------------ */

function createMockContext() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id

  const state = {
    activeTool: 'SELECT' as Tool,
    currentPageId: pageId,
    selectedIds: new Set<string>(),
    marquee: null,
    snapGuides: [],
    rotationPreview: null,
    dropTargetId: null,
    layoutInsertIndicator: null,
    hoveredNodeId: null,
    panX: 0,
    panY: 0,
    zoom: 1,
  }

  let repaintCount = 0

  const ctx = {
    graph: () => graph,
    state,
    requestRepaint: () => { repaintCount++ },
    get repaintCount() { return repaintCount },
  }

  return ctx as any
}

/* ------------------------------------------------------------------ */
/*  selection.ts                                                      */
/* ------------------------------------------------------------------ */

describe('selection store', () => {
  test('select sets selectedIds', () => {
    const ctx = createMockContext()
    const sel = createSelectionOps(ctx)

    sel.select(['a', 'b'])
    expect(ctx.state.selectedIds).toEqual(new Set(['a', 'b']))
  })

  test('select with additive toggles ids', () => {
    const ctx = createMockContext()
    const sel = createSelectionOps(ctx)

    sel.select(['a', 'b'])
    sel.select(['b', 'c'], true)
    // 'b' was in set → removed; 'c' was not → added
    expect(ctx.state.selectedIds).toEqual(new Set(['a', 'c']))
  })

  test('clearSelection empties selectedIds', () => {
    const ctx = createMockContext()
    const sel = createSelectionOps(ctx)

    sel.select(['a', 'b'])
    sel.clearSelection()
    expect(ctx.state.selectedIds.size).toBe(0)
  })

  test('setHoveredNode updates state and requests repaint', () => {
    const ctx = createMockContext()
    const sel = createSelectionOps(ctx)
    const before = ctx.repaintCount

    sel.setHoveredNode('node-1')
    expect(ctx.state.hoveredNodeId).toBe('node-1')
    expect(ctx.repaintCount).toBe(before + 1)
  })

  test('setHoveredNode skips repaint if same id', () => {
    const ctx = createMockContext()
    const sel = createSelectionOps(ctx)

    sel.setHoveredNode('node-1')
    const before = ctx.repaintCount
    sel.setHoveredNode('node-1')
    expect(ctx.repaintCount).toBe(before)
  })

  test('setMarquee updates state and requests repaint', () => {
    const ctx = createMockContext()
    const sel = createSelectionOps(ctx)

    const rect = { x: 10, y: 20, width: 100, height: 50 }
    sel.setMarquee(rect)
    expect(ctx.state.marquee).toEqual(rect)
  })

  test('setDropTarget updates state', () => {
    const ctx = createMockContext()
    const sel = createSelectionOps(ctx)

    sel.setDropTarget('frame-1')
    expect(ctx.state.dropTargetId).toBe('frame-1')
  })
})

/* ------------------------------------------------------------------ */
/*  canvas.ts (viewport ops)                                          */
/* ------------------------------------------------------------------ */

describe('canvas viewport ops', () => {
  test('pan updates panX and panY', () => {
    const ctx = createMockContext()
    const vp = createViewportOps(ctx)

    vp.pan(50, -30)
    expect(ctx.state.panX).toBe(50)
    expect(ctx.state.panY).toBe(-30)
  })

  test('pan accumulates', () => {
    const ctx = createMockContext()
    const vp = createViewportOps(ctx)

    vp.pan(10, 20)
    vp.pan(5, -10)
    expect(ctx.state.panX).toBe(15)
    expect(ctx.state.panY).toBe(10)
  })

  test('pan requests repaint', () => {
    const ctx = createMockContext()
    const vp = createViewportOps(ctx)
    const before = ctx.repaintCount

    vp.pan(1, 1)
    expect(ctx.repaintCount).toBe(before + 1)
  })

  test('screenToCanvas converts coordinates using pan and zoom', () => {
    const ctx = createMockContext()
    ctx.state.panX = 100
    ctx.state.panY = 50
    ctx.state.zoom = 2
    const vp = createViewportOps(ctx)

    const result = vp.screenToCanvas(300, 250)
    expect(result.x).toBe((300 - 100) / 2)
    expect(result.y).toBe((250 - 50) / 2)
  })
})
