import { describe, test, expect } from 'bun:test'

// ── Theme System Tests ──

describe('Theme - Toggle Logic', () => {
  type Theme = 'dark' | 'light' | 'system'

  test('toggle cycles dark → light → system → dark', () => {
    const order: Theme[] = ['dark', 'light', 'system']
    let current: Theme = 'dark'

    function toggle() {
      const idx = order.indexOf(current)
      current = order[(idx + 1) % order.length]
    }

    toggle()
    expect(current).toBe('light')
    toggle()
    expect(current).toBe('system')
    toggle()
    expect(current).toBe('dark')
  })

  test('resolve system theme', () => {
    function resolve(theme: Theme, systemIsDark: boolean): 'dark' | 'light' {
      if (theme === 'system') return systemIsDark ? 'dark' : 'light'
      return theme
    }

    expect(resolve('dark', true)).toBe('dark')
    expect(resolve('light', true)).toBe('light')
    expect(resolve('system', true)).toBe('dark')
    expect(resolve('system', false)).toBe('light')
  })
})

// ── i18n Tests ──

describe('i18n - Translation', () => {
  type Locale = 'en' | 'zh'

  const messages: Record<string, Record<Locale, string>> = {
    'tab.layers': { en: 'Layers', zh: '图层' },
    'tab.design': { en: 'Design', zh: '设计' },
    'action.save': { en: 'Save', zh: '保存' },
    'action.cancel': { en: 'Cancel', zh: '取消' },
  }

  function t(key: string, locale: Locale): string {
    const msg = messages[key]
    if (!msg) return key
    return msg[locale] ?? msg.en ?? key
  }

  test('returns English translation', () => {
    expect(t('tab.layers', 'en')).toBe('Layers')
    expect(t('action.save', 'en')).toBe('Save')
  })

  test('returns Chinese translation', () => {
    expect(t('tab.layers', 'zh')).toBe('图层')
    expect(t('action.save', 'zh')).toBe('保存')
  })

  test('returns key for missing translation', () => {
    expect(t('nonexistent.key', 'en')).toBe('nonexistent.key')
  })

  test('toggle locale', () => {
    let locale: Locale = 'en'
    locale = locale === 'en' ? 'zh' : 'en'
    expect(locale).toBe('zh')
    locale = locale === 'en' ? 'zh' : 'en'
    expect(locale).toBe('en')
  })
})

// ── Component Drag Tests ──

describe('ComponentDrag - Position Calculation', () => {
  function addPositionToNodeData(nodeData: string, x: number, y: number): string {
    try {
      const nodes = JSON.parse(nodeData)
      if (Array.isArray(nodes) && nodes.length > 0) {
        nodes[0].x = x
        nodes[0].y = y
      }
      return JSON.stringify(nodes)
    } catch {
      return nodeData
    }
  }

  function screenToCanvas(sx: number, sy: number, zoom: number, panX: number, panY: number) {
    return {
      cx: (sx - panX) / zoom,
      cy: (sy - panY) / zoom,
    }
  }

  test('screen to canvas coords at 1x zoom', () => {
    const { cx, cy } = screenToCanvas(500, 300, 1, 0, 0)
    expect(cx).toBe(500)
    expect(cy).toBe(300)
  })

  test('screen to canvas coords at 2x zoom with pan', () => {
    const { cx, cy } = screenToCanvas(600, 400, 2, 100, 50)
    expect(cx).toBe(250) // (600 - 100) / 2
    expect(cy).toBe(175) // (400 - 50) / 2
  })

  test('addPositionToNodeData updates first node position', () => {
    const data = JSON.stringify([{ type: 'RECTANGLE', x: 0, y: 0, width: 100, height: 50 }])
    const result = JSON.parse(addPositionToNodeData(data, 200, 300))
    expect(result[0].x).toBe(200)
    expect(result[0].y).toBe(300)
    expect(result[0].width).toBe(100) // unchanged
  })

  test('addPositionToNodeData handles invalid JSON', () => {
    const result = addPositionToNodeData('not json', 0, 0)
    expect(result).toBe('not json')
  })

  test('addPositionToNodeData handles empty array', () => {
    const result = addPositionToNodeData('[]', 100, 200)
    expect(result).toBe('[]')
  })
})

// ── Figma MCP Tests ──

describe('FigmaMCP - URL Parsing', () => {
  test('extract file key from Figma URL', () => {
    const url = 'https://www.figma.com/design/ABC123xyz/My-Design?node-id=1-2'
    const match = url.match(/\/(design|file)\/([^/]+)/)
    expect(match).not.toBeNull()
    expect(match![2]).toBe('ABC123xyz')
  })

  test('extract node-id from Figma URL', () => {
    const url = 'https://www.figma.com/design/ABC/Test?node-id=12-34&t=xyz'
    const match = url.match(/node-id=([^&]+)/)
    expect(match).not.toBeNull()
    expect(match![1]).toBe('12-34')
  })

  test('invalid URL returns no match', () => {
    const url = 'https://example.com/not-figma'
    const match = url.match(/\/(design|file)\/([^/]+)/)
    expect(match).toBeNull()
  })
})

// ── Export Format Tests ──

describe('Export - Format Helpers', () => {
  function exportImageExtension(format: string): string {
    switch (format) {
      case 'JPG': return '.jpg'
      case 'WEBP': return '.webp'
      case 'SVG': return '.svg'
      case 'PDF': return '.pdf'
      default: return '.png'
    }
  }

  function exportImageMime(format: string): string {
    switch (format) {
      case 'JPG': return 'image/jpeg'
      case 'WEBP': return 'image/webp'
      case 'SVG': return 'image/svg+xml'
      case 'PDF': return 'application/pdf'
      default: return 'image/png'
    }
  }

  test('PNG extension and mime', () => {
    expect(exportImageExtension('PNG')).toBe('.png')
    expect(exportImageMime('PNG')).toBe('image/png')
  })

  test('JPG extension and mime', () => {
    expect(exportImageExtension('JPG')).toBe('.jpg')
    expect(exportImageMime('JPG')).toBe('image/jpeg')
  })

  test('SVG extension and mime', () => {
    expect(exportImageExtension('SVG')).toBe('.svg')
    expect(exportImageMime('SVG')).toBe('image/svg+xml')
  })

  test('PDF extension and mime', () => {
    expect(exportImageExtension('PDF')).toBe('.pdf')
    expect(exportImageMime('PDF')).toBe('application/pdf')
  })

  test('WebP extension and mime', () => {
    expect(exportImageExtension('WEBP')).toBe('.webp')
    expect(exportImageMime('WEBP')).toBe('image/webp')
  })

  test('unknown format defaults to PNG', () => {
    expect(exportImageExtension('TIFF')).toBe('.png')
    expect(exportImageMime('TIFF')).toBe('image/png')
  })
})

// ── Brand Settings Tests ──

describe('Brand - CSS Export', () => {
  test('generates valid CSS variables', () => {
    const config = {
      primaryColor: '#6366f1',
      secondaryColor: '#1e1e2e',
      accentColor: '#8b5cf6',
      fontFamily: 'Inter',
      borderRadius: '8',
    }

    const css = `:root {
  --brand-primary: ${config.primaryColor};
  --brand-secondary: ${config.secondaryColor};
  --brand-accent: ${config.accentColor};
  --brand-font: '${config.fontFamily}', sans-serif;
  --brand-radius: ${config.borderRadius}px;
}`

    expect(css).toContain('--brand-primary: #6366f1')
    expect(css).toContain('--brand-secondary: #1e1e2e')
    expect(css).toContain("--brand-font: 'Inter', sans-serif")
    expect(css).toContain('--brand-radius: 8px')
  })
})

// ── Measurement Overlay Tests ──

describe('Measurement - Gap Calculation', () => {
  interface Bounds {
    x1: number; y1: number; x2: number; y2: number
  }

  function horizontalGap(a: Bounds, b: Bounds): number | null {
    if (a.x2 <= b.x1) return b.x1 - a.x2 // A left of B
    if (a.x1 >= b.x2) return a.x1 - b.x2 // A right of B
    return null // overlapping
  }

  function verticalGap(a: Bounds, b: Bounds): number | null {
    if (a.y2 <= b.y1) return b.y1 - a.y2
    if (a.y1 >= b.y2) return a.y1 - b.y2
    return null
  }

  test('horizontal gap between non-overlapping rects', () => {
    const a: Bounds = { x1: 0, y1: 0, x2: 100, y2: 50 }
    const b: Bounds = { x1: 150, y1: 0, x2: 250, y2: 50 }
    expect(horizontalGap(a, b)).toBe(50)
  })

  test('horizontal gap when A is right of B', () => {
    const a: Bounds = { x1: 200, y1: 0, x2: 300, y2: 50 }
    const b: Bounds = { x1: 0, y1: 0, x2: 100, y2: 50 }
    expect(horizontalGap(a, b)).toBe(100)
  })

  test('no horizontal gap when overlapping', () => {
    const a: Bounds = { x1: 0, y1: 0, x2: 150, y2: 50 }
    const b: Bounds = { x1: 100, y1: 0, x2: 250, y2: 50 }
    expect(horizontalGap(a, b)).toBeNull()
  })

  test('vertical gap between stacked rects', () => {
    const a: Bounds = { x1: 0, y1: 0, x2: 100, y2: 50 }
    const b: Bounds = { x1: 0, y1: 80, x2: 100, y2: 130 }
    expect(verticalGap(a, b)).toBe(30)
  })

  test('adjacent rects have zero gap', () => {
    const a: Bounds = { x1: 0, y1: 0, x2: 100, y2: 50 }
    const b: Bounds = { x1: 100, y1: 0, x2: 200, y2: 50 }
    expect(horizontalGap(a, b)).toBe(0)
  })
})
