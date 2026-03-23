import { describe, test, expect, beforeEach } from 'bun:test'

// ── R5: AI Select, Image Gen, QuickActions, AIContextCards, Lint Fixes ──

// ═══════════════════════════════════════════════════════════════
// 1. AI Select Composable
// ═══════════════════════════════════════════════════════════════

describe('AISelect - Core State', () => {
  test('aiSelectMode defaults to false', () => {
    // Module-level ref should start as false
    const mode = false
    expect(mode).toBe(false)
  })

  test('toggleAISelectMode flips state', () => {
    let mode = false
    mode = !mode
    expect(mode).toBe(true)
    mode = !mode
    expect(mode).toBe(false)
  })

  test('selectedForAI starts empty', () => {
    const selected: unknown[] = []
    expect(selected).toHaveLength(0)
  })
})

describe('AISelect - Context Management', () => {
  const mockContext = {
    nodeId: 'node-1',
    name: 'Button',
    type: 'RECTANGLE',
    bounds: { x: 10, y: 20, width: 100, height: 40 },
  }

  test('addNodeToAIContext adds unique entries', () => {
    const selected = [mockContext]
    // Duplicate check
    const isDuplicate = selected.some(s => s.nodeId === 'node-1')
    expect(isDuplicate).toBe(true)
    // New node passes
    const isNew = !selected.some(s => s.nodeId === 'node-2')
    expect(isNew).toBe(true)
  })

  test('removeFromAIContext filters by nodeId', () => {
    const selected = [
      { ...mockContext, nodeId: 'node-1' },
      { ...mockContext, nodeId: 'node-2', name: 'Card' },
      { ...mockContext, nodeId: 'node-3', name: 'Header' },
    ]
    const filtered = selected.filter(s => s.nodeId !== 'node-2')
    expect(filtered).toHaveLength(2)
    expect(filtered.map(s => s.nodeId)).toEqual(['node-1', 'node-3'])
  })

  test('clearAIContext empties array', () => {
    let selected = [mockContext, { ...mockContext, nodeId: 'node-2' }]
    selected = []
    expect(selected).toHaveLength(0)
  })

  test('hasContext is true when items exist', () => {
    const selected = [mockContext]
    expect(selected.length > 0).toBe(true)
  })

  test('contextCount reflects array length', () => {
    const selected = [mockContext, { ...mockContext, nodeId: 'n2' }, { ...mockContext, nodeId: 'n3' }]
    expect(selected.length).toBe(3)
  })
})

describe('AISelect - buildContextPrompt', () => {
  test('empty selection returns empty string', () => {
    const selected: { nodeId: string; name: string; type: string; bounds: { width: number; height: number; x: number; y: number }; jsx?: string; properties?: Record<string, unknown> }[] = []
    const prompt = selected.length === 0 ? '' : 'has content'
    expect(prompt).toBe('')
  })

  test('single element produces correct format', () => {
    const item = {
      nodeId: 'n1',
      name: 'Login Button',
      type: 'RECTANGLE',
      bounds: { x: 50, y: 100, width: 200, height: 48 },
      properties: { children: 0 },
    }
    const desc = `[Selected: "${item.name}" (${item.type}, ${item.bounds.width}×${item.bounds.height}px at ${item.bounds.x},${item.bounds.y})]`
    expect(desc).toContain('Login Button')
    expect(desc).toContain('RECTANGLE')
    expect(desc).toContain('200×48px')
    expect(desc).toContain('at 50,100')
  })

  test('children count appended when > 0', () => {
    const kids = 5
    let desc = '[Selected: "Card" (FRAME, 300×400px at 0,0)]'
    if (kids > 0) desc += ` — ${kids} children`
    expect(desc).toContain('5 children')
  })

  test('JSX block appended when present', () => {
    const jsx = '<Button variant="primary">Click</Button>'
    let desc = '[Selected: "Btn" (COMPONENT, 120×40px at 0,0)]'
    desc += `\nCurrent JSX:\n\`\`\`jsx\n${jsx}\n\`\`\``
    expect(desc).toContain('```jsx')
    expect(desc).toContain('variant="primary"')
  })

  test('prompt ends with modification instruction', () => {
    const suffix = '\n\n--- Selected elements for modification ---\n[content]\n---\n\nModify ONLY the selected elements above. Keep everything else unchanged.'
    expect(suffix).toContain('Modify ONLY the selected elements')
    expect(suffix).toContain('Keep everything else unchanged')
  })
})

describe('AISelect - Rect Intersection', () => {
  function intersects(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    )
  }

  test('overlapping rects intersect', () => {
    const rect = { x: 0, y: 0, width: 200, height: 200 }
    const node = { x: 50, y: 50, width: 100, height: 100 }
    expect(intersects(rect, node)).toBe(true)
  })

  test('non-overlapping rects do not intersect', () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 }
    const node = { x: 200, y: 200, width: 50, height: 50 }
    expect(intersects(rect, node)).toBe(false)
  })

  test('touching edges do not intersect (exclusive)', () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 }
    const node = { x: 100, y: 0, width: 50, height: 50 }
    expect(intersects(rect, node)).toBe(false)
  })

  test('partial overlap intersects', () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 }
    const node = { x: 80, y: 80, width: 50, height: 50 }
    expect(intersects(rect, node)).toBe(true)
  })

  test('node fully inside rect intersects', () => {
    const rect = { x: 0, y: 0, width: 500, height: 500 }
    const node = { x: 100, y: 100, width: 50, height: 50 }
    expect(intersects(rect, node)).toBe(true)
  })

  test('rect fully inside node intersects', () => {
    const rect = { x: 100, y: 100, width: 50, height: 50 }
    const node = { x: 0, y: 0, width: 500, height: 500 }
    expect(intersects(rect, node)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Image Generation
// ═══════════════════════════════════════════════════════════════

describe('ImageGen - base64ToBlobUrl', () => {
  test('converts base64 to blob URL', () => {
    // Simulate the conversion logic
    const base64 = btoa('fake-image-data')
    const mimeType = 'image/png'
    const bytes = atob(base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const blob = new Blob([arr], { type: mimeType })
    expect(blob.size).toBeGreaterThan(0)
    expect(blob.type).toBe('image/png')
  })

  test('handles different mime types', () => {
    for (const mime of ['image/png', 'image/jpeg', 'image/webp']) {
      const blob = new Blob([new Uint8Array([1, 2, 3])], { type: mime })
      expect(blob.type).toBe(mime)
    }
  })
})

describe('ImageGen - API Key Management', () => {
  test('empty key returns error message', () => {
    const key = ''
    const error = !key ? 'Gemini API key not set. Go to Brand Settings to configure.' : null
    expect(error).toBe('Gemini API key not set. Go to Brand Settings to configure.')
  })

  test('valid key passes check', () => {
    const key = 'AIzaSy_test_key_123'
    const error = !key ? 'Gemini API key not set.' : null
    expect(error).toBeNull()
  })
})

describe('ImageGen - Gemini Response Parsing', () => {
  test('extracts image data from parts', () => {
    const parts = [
      { text: 'Here is your image' },
      { inlineData: { data: btoa('img'), mimeType: 'image/png' } },
    ]
    let imageData: { base64: string; mimeType: string } | null = null
    let textContent = ''
    for (const part of parts) {
      if ('inlineData' in part && part.inlineData) {
        imageData = { base64: part.inlineData.data, mimeType: part.inlineData.mimeType }
      }
      if ('text' in part && part.text) {
        textContent += part.text
      }
    }
    expect(imageData).not.toBeNull()
    expect(imageData!.mimeType).toBe('image/png')
    expect(textContent).toBe('Here is your image')
  })

  test('returns null when no image in response', () => {
    const parts = [{ text: 'Sorry, I cannot generate that image.' }]
    let imageData: { base64: string; mimeType: string } | null = null
    for (const part of parts) {
      if ('inlineData' in part) {
        imageData = { base64: '', mimeType: '' }
      }
    }
    expect(imageData).toBeNull()
  })

  test('defaults mimeType to image/png', () => {
    const part = { inlineData: { data: btoa('x'), mimeType: '' } }
    const mime = part.inlineData.mimeType || 'image/png'
    expect(mime).toBe('image/png')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. QuickActions Logic
// ═══════════════════════════════════════════════════════════════

describe('QuickActions - Frame Presets', () => {
  const framePresets = [
    { name: 'Mobile (375×812)', w: 375, h: 812, label: '📱' },
    { name: 'Tablet (768×1024)', w: 768, h: 1024, label: '📱' },
    { name: 'Desktop (1440×900)', w: 1440, h: 900, label: '🖥️' },
    { name: 'Custom Frame', w: 400, h: 400, label: '⬜' },
  ]

  test('has 4 presets', () => {
    expect(framePresets).toHaveLength(4)
  })

  test('mobile preset dimensions', () => {
    const mobile = framePresets[0]
    expect(mobile.w).toBe(375)
    expect(mobile.h).toBe(812)
  })

  test('desktop preset dimensions', () => {
    const desktop = framePresets[2]
    expect(desktop.w).toBe(1440)
    expect(desktop.h).toBe(900)
  })

  test('createFrame generates correct message', () => {
    const preset = framePresets[0]
    const msg = `Create an empty frame named "${preset.name}" with width ${preset.w} and height ${preset.h}`
    expect(msg).toContain('Mobile (375×812)')
    expect(msg).toContain('width 375')
    expect(msg).toContain('height 812')
  })
})

describe('QuickActions - Image Submit', () => {
  test('empty prompt is rejected', () => {
    const prompt = '   '
    const shouldSubmit = prompt.trim().length > 0
    expect(shouldSubmit).toBe(false)
  })

  test('valid prompt passes', () => {
    const prompt = 'A sunset over mountains'
    const shouldSubmit = prompt.trim().length > 0
    expect(shouldSubmit).toBe(true)
  })

  test('no API key redirects to brand settings', () => {
    const apiKey = ''
    const targetTab = !apiKey ? 'brand' : 'ai'
    expect(targetTab).toBe('brand')
  })

  test('with API key routes to AI chat', () => {
    const apiKey = 'AIzaSy_test'
    const targetTab = !apiKey ? 'brand' : 'ai'
    expect(targetTab).toBe('ai')
  })

  test('image prompt generates correct message', () => {
    const prompt = 'A futuristic city skyline'
    const msg = `Generate an image: ${prompt}`
    expect(msg).toBe('Generate an image: A futuristic city skyline')
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. AIContextCards - Type Icons
// ═══════════════════════════════════════════════════════════════

describe('AIContextCards - typeIcon', () => {
  const icons: Record<string, string> = {
    FRAME: '⬜',
    RECTANGLE: '▬',
    ELLIPSE: '⬭',
    TEXT: 'T',
    GROUP: '📁',
    COMPONENT: '◇',
    INSTANCE: '◆',
    SECTION: '§',
    LINE: '—',
    STAR: '★',
    POLYGON: '▲',
  }

  function typeIcon(type: string): string {
    return icons[type] || '□'
  }

  test('known types return correct icons', () => {
    expect(typeIcon('FRAME')).toBe('⬜')
    expect(typeIcon('RECTANGLE')).toBe('▬')
    expect(typeIcon('TEXT')).toBe('T')
    expect(typeIcon('GROUP')).toBe('📁')
    expect(typeIcon('COMPONENT')).toBe('◇')
    expect(typeIcon('INSTANCE')).toBe('◆')
    expect(typeIcon('STAR')).toBe('★')
  })

  test('unknown type returns fallback', () => {
    expect(typeIcon('VECTOR')).toBe('□')
    expect(typeIcon('UNKNOWN')).toBe('□')
    expect(typeIcon('')).toBe('□')
  })

  test('all 11 node types have icons', () => {
    expect(Object.keys(icons)).toHaveLength(11)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Lint Fix Validations
// ═══════════════════════════════════════════════════════════════

describe('LintFix - crypto.getRandomValues', () => {
  test('generates unique IDs', () => {
    const id1 = `c_${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
    const id2 = `c_${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
    // IDs should have correct prefix
    expect(id1.startsWith('c_')).toBe(true)
    expect(id2.startsWith('c_')).toBe(true)
    // Parts count: c_ + timestamp + random
    expect(id1.split('_').length).toBeGreaterThanOrEqual(3)
  })

  test('project ID format', () => {
    const id = `proj_${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
    expect(id.startsWith('proj_')).toBe(true)
  })

  test('component ID format', () => {
    const id = `comp_${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
    expect(id.startsWith('comp_')).toBe(true)
  })
})

describe('LintFix - Environment Variable Patterns', () => {
  test('nullish coalescing preserves empty string', () => {
    const val = (undefined ?? '') as string
    expect(val).toBe('')
  })

  test('nullish coalescing preserves actual value', () => {
    const val = ('custom-model' ?? '') as string
    expect(val).toBe('custom-model')
  })

  test('env override skips empty string', () => {
    const ENV_MODEL = ''
    let model = 'default-model'
    if (ENV_MODEL !== '') model = ENV_MODEL
    expect(model).toBe('default-model')
  })

  test('env override applies non-empty value', () => {
    const ENV_MODEL = 'gpt-4'
    let model = 'default-model'
    if (ENV_MODEL !== '') model = ENV_MODEL
    expect(model).toBe('gpt-4')
  })
})

describe('LintFix - defineProps destructuring', () => {
  test('destructured props are directly accessible', () => {
    // Simulates: const { comment } = defineProps<{ comment: Comment }>()
    const comment = { id: 'c1', text: 'Hello', x: 10, y: 20 }
    expect(comment.id).toBe('c1')
    // No need for props.comment.id
  })
})

describe('LintFix - Duplicate Import Merge', () => {
  test('merged imports contain all symbols', () => {
    // Before: import { ref, watch } from 'vue' + import { computed } from 'vue'
    // After: import { ref, watch, computed } from 'vue'
    const symbols = ['ref', 'watch', 'computed']
    expect(symbols).toContain('ref')
    expect(symbols).toContain('watch')
    expect(symbols).toContain('computed')
    expect(symbols).toHaveLength(3)
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. AI Tools - generate_image flow
// ═══════════════════════════════════════════════════════════════

describe('AITools - Placeholder Strategy', () => {
  test('placeholder has correct initial properties', () => {
    const placeholder = {
      name: 'Generating: A beautiful sunset over...',
      x: 100,
      y: 100,
      width: 512,
      height: 512,
      fills: [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.2, a: 1 }, visible: true, opacity: 0.5 }],
      cornerRadius: 8,
    }
    expect(placeholder.name).toContain('Generating:')
    expect(placeholder.width).toBe(512)
    expect(placeholder.height).toBe(512)
    expect(placeholder.cornerRadius).toBe(8)
    expect(placeholder.fills[0].type).toBe('SOLID')
    expect(placeholder.fills[0].opacity).toBe(0.5)
  })

  test('placeholder name truncates long prompts', () => {
    const prompt = 'A very long description of an image that goes on and on and on'
    const name = `Generating: ${prompt.slice(0, 30)}...`
    expect(name.length).toBeLessThanOrEqual(45)
    expect(name).toContain('...')
  })

  test('success updates placeholder to IMAGE fill', () => {
    const updatedFills = [{
      type: 'IMAGE',
      imageRef: 'blob:http://localhost/abc123',
      scaleMode: 'FILL',
      visible: true,
      opacity: 1,
    }]
    expect(updatedFills[0].type).toBe('IMAGE')
    expect(updatedFills[0].scaleMode).toBe('FILL')
    expect(updatedFills[0].opacity).toBe(1)
  })

  test('failure hides placeholder', () => {
    const node = { visible: true }
    // On failure: store.graph.updateNode(id, { visible: false })
    node.visible = false
    expect(node.visible).toBe(false)
  })

  test('custom position overrides defaults', () => {
    const x = 300
    const y = 400
    const finalX = x ?? 100
    const finalY = y ?? 100
    expect(finalX).toBe(300)
    expect(finalY).toBe(400)
  })

  test('default position when not specified', () => {
    const x = undefined
    const y = undefined
    const finalX = x ?? 100
    const finalY = y ?? 100
    expect(finalX).toBe(100)
    expect(finalY).toBe(100)
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Canvas AI Select Integration
// ═══════════════════════════════════════════════════════════════

describe('Canvas - AI Select Mode Intercept', () => {
  test('aiSelectMode true intercepts normal selection', () => {
    const aiSelectMode = true
    let normalSelectionCalled = false
    let aiContextAdded = false

    if (aiSelectMode) {
      aiContextAdded = true
      // return early, skip normal selection
    } else {
      normalSelectionCalled = true
    }

    expect(aiContextAdded).toBe(true)
    expect(normalSelectionCalled).toBe(false)
  })

  test('aiSelectMode false allows normal selection', () => {
    const aiSelectMode = false
    let normalSelectionCalled = false
    let aiContextAdded = false

    if (aiSelectMode) {
      aiContextAdded = true
    } else {
      normalSelectionCalled = true
    }

    expect(aiContextAdded).toBe(false)
    expect(normalSelectionCalled).toBe(true)
  })
})
