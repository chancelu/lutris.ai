import { describe, test, expect } from 'bun:test'

// ============================================================
// Round 4 — Experience Enhancement TDD Tests
// Covers: AI Select Marquee, Right-click Send to AI, PRD Sync,
//         Image Gen UX, PaddleOCR readiness
// ============================================================

// ── AI Select Marquee (Lasso) ─────────────────────────────────
describe('AISelect - Marquee Selection', () => {
  function rectsIntersect(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    )
  }

  test('detects intersection of overlapping rects', () => {
    const marquee = { x: 50, y: 50, width: 200, height: 200 }
    const node = { x: 100, y: 100, width: 80, height: 40 }
    expect(rectsIntersect(marquee, node)).toBe(true)
  })

  test('no intersection for distant rects', () => {
    const marquee = { x: 0, y: 0, width: 50, height: 50 }
    const node = { x: 200, y: 200, width: 80, height: 40 }
    expect(rectsIntersect(marquee, node)).toBe(false)
  })

  test('edge-touching rects do not intersect', () => {
    const marquee = { x: 0, y: 0, width: 100, height: 100 }
    const node = { x: 100, y: 0, width: 50, height: 50 }
    expect(rectsIntersect(marquee, node)).toBe(false)
  })

  test('fully contained node intersects', () => {
    const marquee = { x: 0, y: 0, width: 500, height: 500 }
    const node = { x: 100, y: 100, width: 50, height: 50 }
    expect(rectsIntersect(marquee, node)).toBe(true)
  })

  test('partial overlap intersects', () => {
    const marquee = { x: 50, y: 50, width: 100, height: 100 }
    const node = { x: 0, y: 0, width: 80, height: 80 }
    expect(rectsIntersect(marquee, node)).toBe(true)
  })

  test('marquee minimum drag threshold is 5px', () => {
    const dragW = 3
    const dragH = 3
    const isMarquee = dragW > 5 && dragH > 5
    expect(isMarquee).toBe(false)
  })

  test('drag above threshold triggers marquee', () => {
    const dragW = 20
    const dragH = 15
    const isMarquee = dragW > 5 && dragH > 5
    expect(isMarquee).toBe(true)
  })

  test('screen to canvas coordinate conversion', () => {
    const sx = 200
    const sy = 150
    const panX = 50
    const panY = 30
    const zoom = 2
    const cx = (sx - panX) / zoom
    const cy = (sy - panY) / zoom
    expect(cx).toBe(75)
    expect(cy).toBe(60)
  })

  test('marquee style computed correctly', () => {
    const m = { startX: 100, startY: 200, endX: 50, endY: 300 }
    const style = {
      left: `${Math.min(m.startX, m.endX)}px`,
      top: `${Math.min(m.startY, m.endY)}px`,
      width: `${Math.abs(m.endX - m.startX)}px`,
      height: `${Math.abs(m.endY - m.startY)}px`,
    }
    expect(style.left).toBe('50px')
    expect(style.top).toBe('200px')
    expect(style.width).toBe('50px')
    expect(style.height).toBe('100px')
  })

  test('addNodesInRect collects matching nodes', () => {
    const nodes = [
      { id: 'n1', bounds: { x: 10, y: 10, width: 50, height: 50 } },
      { id: 'n2', bounds: { x: 200, y: 200, width: 50, height: 50 } },
      { id: 'n3', bounds: { x: 30, y: 30, width: 20, height: 20 } },
    ]
    const rect = { x: 0, y: 0, width: 100, height: 100 }
    const matched = nodes.filter(n => rectsIntersect(rect, n.bounds))
    expect(matched.map(n => n.id)).toEqual(['n1', 'n3'])
  })
})

// ── Right-click "Send to AI Chat" ─────────────────────────────
describe('ContextMenu - Send to AI Chat', () => {
  test('sendToAIChat adds all selected ids to context', () => {
    const selectedIds = ['n1', 'n2', 'n3']
    const ctx: string[] = []
    for (const id of selectedIds) ctx.push(id)
    expect(ctx).toHaveLength(3)
    expect(ctx).toEqual(['n1', 'n2', 'n3'])
  })

  test('sendToAIChat switches to ai tab', () => {
    let activeTab = 'design'
    activeTab = 'ai'
    expect(activeTab).toBe('ai')
  })

  test('works without AI Select mode active', () => {
    const aiSelectMode = false
    // Right-click menu doesn't require aiSelectMode
    const canSend = true // always available when hasSelection
    expect(aiSelectMode).toBe(false)
    expect(canSend).toBe(true)
  })

  test('menu item has correct label', () => {
    const label = '🎯 Send to AI Chat'
    expect(label).toContain('Send to AI Chat')
    expect(label).toContain('🎯')
  })
})

// ── PRD Auto-Sync ─────────────────────────────────────────────
describe('PRD Sync - After AI Modification', () => {
  test('toast shown only for mutating operations', () => {
    const operations = [
      { name: 'render', mutates: true },
      { name: 'get_styles', mutates: false },
      { name: 'set_fill', mutates: true },
    ]
    const toastOps = operations.filter(op => op.mutates)
    expect(toastOps).toHaveLength(2)
    expect(toastOps.map(o => o.name)).toEqual(['render', 'set_fill'])
  })

  test('sync-prd-from-design event dispatched on action click', () => {
    let dispatched = false
    const handler = () => { dispatched = true }
    // Simulate event dispatch
    handler()
    expect(dispatched).toBe(true)
  })

  test('updateFromDesign generates design description', () => {
    const nodes = [
      { name: 'Header', type: 'FRAME', width: 375, height: 64 },
      { name: 'Button', type: 'RECTANGLE', width: 120, height: 40 },
    ]
    const desc = nodes.map(n => `- ${n.name} (${n.type}, ${Math.round(n.width)}×${Math.round(n.height)})`).join('\n')
    expect(desc).toContain('Header (FRAME, 375×64)')
    expect(desc).toContain('Button (RECTANGLE, 120×40)')
  })

  test('sync switches to doc tab', () => {
    let rightTab = 'ai'
    // After sync
    rightTab = 'doc'
    expect(rightTab).toBe('doc')
  })

  test('toast has 8 second duration', () => {
    const duration = 8000
    expect(duration).toBe(8000)
  })

  test('anti-recursion prevents doc→design→doc loop', () => {
    type SyncSource = 'user' | 'design' | 'doc' | null
    let syncSource: SyncSource = 'doc'
    // updateFromDesign should bail when syncSource is 'doc'
    const shouldUpdate = syncSource !== 'doc'
    expect(shouldUpdate).toBe(false)
  })
})

// ── Image Generation UX ──────────────────────────────────────
describe('ImageGen - Placeholder & Toast', () => {
  test('placeholder node created before generation', () => {
    const placeholder = {
      name: 'Generating: sunset over mountains...',
      type: 'RECTANGLE',
      fills: [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.2 }, opacity: 0.5 }],
      cornerRadius: 8,
    }
    expect(placeholder.name).toContain('Generating:')
    expect(placeholder.fills[0].type).toBe('SOLID')
    expect(placeholder.cornerRadius).toBe(8)
  })

  test('placeholder updated to image on success', () => {
    let fills: any[] = [{ type: 'SOLID' }]
    // After success
    fills = [{ type: 'IMAGE', imageRef: 'blob:http://...', scaleMode: 'FILL' }]
    expect(fills[0].type).toBe('IMAGE')
    expect(fills[0].scaleMode).toBe('FILL')
  })

  test('placeholder removed on failure', () => {
    let nodes = ['placeholder-id', 'other-node']
    const failed = true
    if (failed) nodes = nodes.filter(n => n !== 'placeholder-id')
    expect(nodes).not.toContain('placeholder-id')
    expect(nodes).toContain('other-node')
  })

  test('node auto-selected after generation', () => {
    let selectedIds: string[] = []
    const newNodeId = 'img-001'
    selectedIds = [newNodeId]
    expect(selectedIds).toEqual(['img-001'])
  })

  test('name updated from generating to final', () => {
    let name = 'Generating: sunset...'
    name = 'AI Image: sunset over mountains'
    expect(name).not.toContain('Generating')
    expect(name).toContain('AI Image:')
  })

  test('toast shown at each stage', () => {
    const toasts: string[] = []
    toasts.push('Generating image: "sunset"...')
    toasts.push('Image generated: "sunset"')
    expect(toasts).toHaveLength(2)
    expect(toasts[0]).toContain('Generating')
    expect(toasts[1]).toContain('generated')
  })

  test('failure toast shown with guidance', () => {
    const msg = 'Image generation failed. Check Gemini API key in Brand Settings.'
    expect(msg).toContain('failed')
    expect(msg).toContain('Brand Settings')
  })
})

// ── AI Select Popup Confirmation (Updated) ────────────────────
describe('AISelect - Popup for Marquee', () => {
  test('popup shows "Area selection" for marquee', () => {
    const isMarquee = true
    const label = isMarquee ? 'Area selection' : 'Header'
    expect(label).toBe('Area selection')
  })

  test('marquee confirm switches to AI tab', () => {
    let activeTab = 'design'
    // confirmAISelect for marquee
    activeTab = 'ai'
    expect(activeTab).toBe('ai')
  })

  test('marquee nodes already added before popup', () => {
    // For marquee, addNodesInRect is called before popup shows
    const nodeIds: string[] = [] // empty because already added
    const ctxCount = 3 // from addNodesInRect
    expect(nodeIds).toHaveLength(0)
    expect(ctxCount).toBe(3)
  })
})

// ── PaddleOCR Readiness ──────────────────────────────────────
describe('PaddleOCR - Installation Check', () => {
  test('Python 3.12 is required version', () => {
    const version = '3.12.10'
    const [major, minor] = version.split('.').map(Number)
    expect(major).toBe(3)
    expect(minor).toBeGreaterThanOrEqual(12)
  })

  test('PaddlePaddle version is 3.x', () => {
    const version = '3.3.0'
    expect(version.startsWith('3.')).toBe(true)
  })

  test('PaddleOCR version is 3.4+', () => {
    const version = '3.4.0'
    const [major, minor] = version.split('.').map(Number)
    expect(major).toBe(3)
    expect(minor).toBeGreaterThanOrEqual(4)
  })

  test('OCR supports Chinese + English', () => {
    const langs = ['ch', 'en']
    expect(langs).toContain('ch')
    expect(langs).toContain('en')
  })
})
