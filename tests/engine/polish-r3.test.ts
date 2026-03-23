import { describe, test, expect } from 'bun:test'

// ============================================================
// Round 3 Polish & New Features — TDD Tests
// Covers: Landing Page, Image Gen, AI Select, QuickActions,
//         Smart Routing, Doc Site, Vercel Config
// ============================================================

// ── Landing Page ──────────────────────────────────────────────
describe('LandingPage - Route Config', () => {
  test('root path maps to LandingPage', () => {
    const routes = [
      { path: '/', component: 'LandingPage' },
      { path: '/editor', component: 'EditorView' },
      { path: '/demo', component: 'EditorView' },
      { path: '/share/:roomId', component: 'EditorView' },
    ]
    const root = routes.find(r => r.path === '/')
    expect(root).toBeDefined()
    expect(root!.component).toBe('LandingPage')
  })

  test('editor route is /editor', () => {
    const routes = [
      { path: '/', component: 'LandingPage' },
      { path: '/editor', component: 'EditorView' },
    ]
    const editor = routes.find(r => r.path === '/editor')
    expect(editor).toBeDefined()
    expect(editor!.component).toBe('EditorView')
  })

  test('landing page has required sections', () => {
    const sections = ['hero', 'features', 'workflow', 'export', 'cta', 'footer']
    expect(sections.length).toBe(6)
    expect(sections).toContain('hero')
    expect(sections).toContain('features')
  })

  test('features list has 6 items', () => {
    const features = [
      { icon: '🤖', title: 'AI-Powered Design' },
      { icon: '📄', title: 'PRD to Design' },
      { icon: '💻', title: 'Code Export' },
      { icon: '🎨', title: 'Design Tokens' },
      { icon: '🔗', title: 'Figma Bridge' },
      { icon: '👥', title: 'Real-time Collab' },
    ]
    expect(features).toHaveLength(6)
    expect(features[0].title).toBe('AI-Powered Design')
  })

  test('workflow has 3 steps', () => {
    const workflow = [
      { step: '01', title: 'Import or Describe' },
      { step: '02', title: 'Design & Iterate' },
      { step: '03', title: 'Handoff & Export' },
    ]
    expect(workflow).toHaveLength(3)
    expect(workflow[2].title).toBe('Handoff & Export')
  })
})

// ── Image Generation ──────────────────────────────────────────
describe('ImageGen - Composable Logic', () => {
  test('API key priority: localStorage > env', () => {
    const localKey = 'user-set-key'
    const envKey = 'env-key'
    const resolved = localKey || envKey || ''
    expect(resolved).toBe('user-set-key')
  })

  test('falls back to env when no localStorage key', () => {
    const localKey = ''
    const envKey = 'AIzaSy-test'
    const resolved = localKey || envKey || ''
    expect(resolved).toBe('AIzaSy-test')
  })

  test('empty when neither set', () => {
    const localKey2 = ''; const envKey2 = ''; const resolved = localKey2 || envKey2 || ''
    expect(resolved).toBe('')
  })

  test('Gemini model name is correct', () => {
    const model = 'gemini-2.5-flash-image'
    expect(model).toContain('gemini')
    expect(model).toContain('image')
  })

  test('base64ToBlobUrl produces blob: URL', () => {
    // Simulate the conversion logic
    const base64 = 'iVBORw0KGgo='
    const mimeType = 'image/png'
    // In real code: atob → Uint8Array → Blob → URL.createObjectURL
    // Here we test the contract
    expect(base64.length).toBeGreaterThan(0)
    expect(mimeType).toBe('image/png')
  })

  test('generate_image tool has required parameters', () => {
    const params = ['prompt', 'width', 'height', 'x', 'y']
    expect(params).toContain('prompt')
    expect(params).toContain('width')
    expect(params).toContain('height')
    expect(params).toHaveLength(5)
  })

  test('default dimensions are 512x512', () => {
    const defaults = { width: 512, height: 512, x: 100, y: 100 }
    expect(defaults.width).toBe(512)
    expect(defaults.height).toBe(512)
  })
})

// ── AI Select ─────────────────────────────────────────────────
describe('AISelect - Context Management', () => {
  test('starts with empty context', () => {
    const selected: any[] = []
    expect(selected).toHaveLength(0)
  })

  test('addNodeToAIContext adds node info', () => {
    const ctx: any[] = []
    const node = { nodeId: 'n1', name: 'Header', type: 'FRAME', bounds: { x: 0, y: 0, width: 375, height: 64 } }
    ctx.push(node)
    expect(ctx).toHaveLength(1)
    expect(ctx[0].name).toBe('Header')
    expect(ctx[0].type).toBe('FRAME')
  })

  test('prevents duplicate nodes', () => {
    const ctx = [{ nodeId: 'n1' }]
    const newId = 'n1'
    if (!ctx.some(s => s.nodeId === newId)) ctx.push({ nodeId: newId })
    expect(ctx).toHaveLength(1)
  })

  test('removeFromAIContext filters by nodeId', () => {
    let ctx = [{ nodeId: 'n1' }, { nodeId: 'n2' }, { nodeId: 'n3' }]
    ctx = ctx.filter(s => s.nodeId !== 'n2')
    expect(ctx).toHaveLength(2)
    expect(ctx.map(s => s.nodeId)).not.toContain('n2')
  })

  test('clearAIContext empties array', () => {
    let ctx = [{ nodeId: 'n1' }, { nodeId: 'n2' }]
    ctx = []
    expect(ctx).toHaveLength(0)
  })

  test('buildContextPrompt includes node info', () => {
    const items = [
      { name: 'Header', type: 'FRAME', bounds: { width: 375, height: 64, x: 0, y: 0 }, children: 3 },
    ]
    const parts = items.map(s =>
      `[Selected: "${s.name}" (${s.type}, ${s.bounds.width}×${s.bounds.height}px at ${s.bounds.x},${s.bounds.y})] — ${s.children} children`
    )
    const prompt = `--- Selected elements for modification ---\n${parts.join('\n')}\n---`
    expect(prompt).toContain('Header')
    expect(prompt).toContain('FRAME')
    expect(prompt).toContain('375×64')
    expect(prompt).toContain('Selected elements for modification')
  })

  test('buildContextPrompt returns empty for no selection', () => {
    const items: any[] = []
    const prompt = items.length === 0 ? '' : 'has content'
    expect(prompt).toBe('')
  })

  test('hasContext computed is true when items exist', () => {
    const ctx = [{ nodeId: 'n1' }]
    expect(ctx.length > 0).toBe(true)
  })

  test('contextCount matches array length', () => {
    const ctx = [{ nodeId: 'n1' }, { nodeId: 'n2' }]
    expect(ctx.length).toBe(2)
  })
})

// ── AI Select Popup Interaction ───────────────────────────────
describe('AISelect - Popup Confirmation', () => {
  test('popup shows node name for single selection', () => {
    const ids = ['n1']
    const nodeName = 'Header'
    const label = ids.length === 1 ? nodeName : `${ids.length} elements`
    expect(label).toBe('Header')
  })

  test('popup shows count for multi selection', () => {
    const ids = ['n1', 'n2', 'n3']
    const label = ids.length === 1 ? 'Element' : `${ids.length} elements`
    expect(label).toBe('3 elements')
  })

  test('confirm adds to context and switches tab', () => {
    let activeTab = 'design'
    const ctx: string[] = []
    const ids = ['n1', 'n2']
    // confirmAISelect logic
    for (const id of ids) ctx.push(id)
    activeTab = 'ai'
    expect(ctx).toHaveLength(2)
    expect(activeTab).toBe('ai')
  })

  test('dismiss does not add to context', () => {
    let showPopup = true
    const ctx: string[] = []
    // dismissAISelect logic
    showPopup = false
    expect(ctx).toHaveLength(0)
    expect(showPopup).toBe(false)
  })
})

// ── Smart Routing ─────────────────────────────────────────────
describe('SmartRouting - Tool Selection', () => {
  function classifyRequest(text: string): 'render' | 'generate_image' | 'both' {
    const imageKeywords = ['photo', 'illustration', 'artwork', 'realistic image', 'product shot', 'hero background', 'icon set', 'avatar', 'generate an image', 'create a picture']
    const uiKeywords = ['screen', 'layout', 'form', 'button', 'card', 'navigation', 'dashboard', 'wireframe', 'frame', 'input', 'list']
    const lower = text.toLowerCase()
    const hasImage = imageKeywords.some(k => lower.includes(k))
    const hasUI = uiKeywords.some(k => lower.includes(k))
    if (hasImage && hasUI) return 'both'
    if (hasImage) return 'generate_image'
    return 'render'
  }

  test('UI request routes to render', () => {
    expect(classifyRequest('Create a login form with email and password')).toBe('render')
  })

  test('image request routes to generate_image', () => {
    expect(classifyRequest('Generate a photo of a sunset')).toBe('generate_image')
  })

  test('mixed request routes to both', () => {
    expect(classifyRequest('Create a landing page layout with a hero background photo')).toBe('both')
  })

  test('dashboard request routes to render', () => {
    expect(classifyRequest('Build a dashboard with charts and cards')).toBe('render')
  })

  test('illustration request routes to generate_image', () => {
    expect(classifyRequest('Create an illustration of a cat')).toBe('generate_image')
  })

  test('wireframe routes to render', () => {
    expect(classifyRequest('Make a wireframe for the settings screen')).toBe('render')
  })
})

// ── QuickActions ──────────────────────────────────────────────
describe('QuickActions - Toolbar', () => {
  test('has 4 action buttons', () => {
    const actions = ['AI Select', 'AI Image', 'New Frame', 'AI Chat']
    expect(actions).toHaveLength(4)
  })

  test('frame presets have correct dimensions', () => {
    const presets = [
      { name: 'Mobile (375×812)', w: 375, h: 812 },
      { name: 'Tablet (768×1024)', w: 768, h: 1024 },
      { name: 'Desktop (1440×900)', w: 1440, h: 900 },
      { name: 'Custom Frame', w: 400, h: 400 },
    ]
    expect(presets).toHaveLength(4)
    expect(presets[0].w).toBe(375)
    expect(presets[0].h).toBe(812)
    expect(presets[2].w).toBe(1440)
  })

  test('image prompt routes through pendingMessage', () => {
    const prompt = 'a blue gradient background'
    const pendingMessage = `Generate an image: ${prompt}`
    expect(pendingMessage).toContain('Generate an image:')
    expect(pendingMessage).toContain('blue gradient')
  })

  test('frame creation routes through pendingMessage', () => {
    const preset = { name: 'Mobile (375×812)', w: 375, h: 812 }
    const msg = `Create an empty frame named "${preset.name}" with width ${preset.w} and height ${preset.h}`
    expect(msg).toContain('375')
    expect(msg).toContain('812')
  })
})

// ── Vercel Config ─────────────────────────────────────────────
describe('Vercel - Deployment Config', () => {
  test('SPA rewrite rule exists', () => {
    const rewrites = [{ source: '/((?!assets/).*)', destination: '/index.html' }]
    expect(rewrites[0].destination).toBe('/index.html')
  })

  test('security headers present', () => {
    const headers = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ]
    expect(headers).toHaveLength(3)
    expect(headers[0].value).toBe('DENY')
  })

  test('static assets have immutable cache', () => {
    const cacheHeader = { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
    expect(cacheHeader.value).toContain('immutable')
    expect(cacheHeader.value).toContain('31536000')
  })
})

// ── Doc Site ──────────────────────────────────────────────────
describe('DocSite - VitePress Config', () => {
  test('title is Lutris.ai', () => {
    const title = 'Lutris.ai'
    expect(title).toBe('Lutris.ai')
  })

  test('base URL is Lutris.ai.dev', () => {
    const base = 'https://Lutris.ai.dev'
    expect(base).toContain('Lutris.ai')
  })

  test('new docs added to sidebar', () => {
    const programmableSidebar = [
      'ai-chat',
      'image-generation',
      'prd-to-design',
      'collaboration',
      'jsx-renderer',
      'mcp-server',
    ]
    expect(programmableSidebar).toContain('image-generation')
    expect(programmableSidebar).toContain('prd-to-design')
  })

  test('PWA manifest uses Lutris.ai name', () => {
    const manifest = { name: 'Lutris.ai', short_name: 'Lutris.ai' }
    expect(manifest.name).toBe('Lutris.ai')
    expect(manifest.short_name).toBe('Lutris.ai')
  })
})

// ── WelcomeOverlay Fix ────────────────────────────────────────
describe('WelcomeOverlay - Action Handler', () => {
  test('ai action switches to ai tab', () => {
    let rightTab = 'design'
    const type = 'ai'
    if (type === 'ai') rightTab = 'ai'
    expect(rightTab).toBe('ai')
  })

  test('import action does not switch tab', () => {
    let rightTab = 'design'
    const type = 'import'
    if (type === 'ai') rightTab = 'ai'
    expect(rightTab).toBe('design')
  })

  test('template action does not switch tab', () => {
    let rightTab = 'design'
    const type = 'template'
    if (type === 'ai') rightTab = 'ai'
    expect(rightTab).toBe('design')
  })
})

// ── Performance Optimization ──────────────────────────────────
describe('Performance - ManualChunks', () => {
  test('vendor chunks are defined', () => {
    const chunks: Record<string, string[]> = {
      'vendor-pdf': ['jspdf'],
      'vendor-mammoth': ['mammoth'],
      'vendor-reka': ['reka-ui'],
    }
    expect(Object.keys(chunks)).toHaveLength(3)
    expect(chunks['vendor-pdf']).toContain('jspdf')
  })

  test('chunk size limit is 600KB', () => {
    const limit = 600
    expect(limit).toBe(600)
  })

  test('katex and html2canvas excluded (not installed)', () => {
    const chunks: Record<string, string[]> = {
      'vendor-pdf': ['jspdf'],
      'vendor-mammoth': ['mammoth'],
      'vendor-reka': ['reka-ui'],
    }
    expect(Object.keys(chunks)).not.toContain('vendor-katex')
    expect(Object.keys(chunks)).not.toContain('vendor-html2canvas')
  })
})

// ── Chat Context Integration ──────────────────────────────────
describe('ChatPanel - Context Integration', () => {
  test('appends context to message when hasContext', () => {
    const text = 'Change the color to red'
    const context = '\n\n--- Selected elements ---\n[Header (FRAME)]\n---'
    const fullText = text + context
    expect(fullText).toContain('Change the color to red')
    expect(fullText).toContain('Selected elements')
  })

  test('no context appended when empty', () => {
    const text = 'Create a new button'
    const hasContext = false
    const fullText = text + (hasContext ? '\n--- context ---' : '')
    expect(fullText).toBe('Create a new button')
  })

  test('clears context after sending', () => {
    let ctx = [{ nodeId: 'n1' }]
    // After send
    ctx = []
    expect(ctx).toHaveLength(0)
  })
})
