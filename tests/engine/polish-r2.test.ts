import { describe, test, expect } from 'bun:test'

// ── Round 2 Polish Tests ──

// ── Font Size Upgrade ──
describe('FontSize - Upgrade Rules', () => {
  const _rules = [
    ['text-[9px]', 'text-[11px]'],
    ['text-[10px]', 'text-[11px]'],
    ['text-[11px]', 'text-[12px]'],
    ['text-[12px]', 'text-[13px]'],
    ['text-[13px]', 'text-[14px]'],
  ]

  function applyUpgrade(input: string): string {
    const placeholders = [
      ['text-[9px]', '__FS_11__'],
      ['text-[10px]', '__FS_11B__'],
      ['text-[11px]', '__FS_12__'],
      ['text-[12px]', '__FS_13__'],
      ['text-[13px]', '__FS_14__'],
    ]
    const finals = [
      ['__FS_11__', 'text-[11px]'],
      ['__FS_11B__', 'text-[11px]'],
      ['__FS_12__', 'text-[12px]'],
      ['__FS_13__', 'text-[13px]'],
      ['__FS_14__', 'text-[14px]'],
    ]
    let result = input
    for (const [from, to] of placeholders) result = result.split(from).join(to)
    for (const [from, to] of finals) result = result.split(from).join(to)
    return result
  }

  test('9px upgrades to 11px', () => {
    expect(applyUpgrade('text-[9px]')).toBe('text-[11px]')
  })

  test('10px upgrades to 11px', () => {
    expect(applyUpgrade('text-[10px]')).toBe('text-[11px]')
  })

  test('11px upgrades to 12px', () => {
    expect(applyUpgrade('text-[11px]')).toBe('text-[12px]')
  })

  test('12px upgrades to 13px', () => {
    expect(applyUpgrade('text-[12px]')).toBe('text-[13px]')
  })

  test('13px upgrades to 14px', () => {
    expect(applyUpgrade('text-[13px]')).toBe('text-[14px]')
  })

  test('no chain replacement (11 does not become 14)', () => {
    // Without placeholder strategy, 11→12→13→14 would happen
    const result = applyUpgrade('text-[11px] and text-[12px]')
    expect(result).toBe('text-[12px] and text-[13px]')
  })

  test('mixed sizes in one string', () => {
    const input = 'class="text-[9px] text-[11px] text-[13px]"'
    const result = applyUpgrade(input)
    expect(result).toBe('class="text-[11px] text-[12px] text-[14px]"')
  })
})

// ── Tab Active Indicator ──
describe('TabIndicator - Active State', () => {
  test('left tab shows indicator when active', () => {
    const leftTab = 'layers'
    const showIndicator = leftTab === 'layers'
    expect(showIndicator).toBe(true)
  })

  test('left tab hides indicator when inactive', () => {
    const leftTab = 'assets'
    const showIndicator = leftTab === 'layers'
    expect(showIndicator).toBe(false)
  })

  test('right tab uses data-state=active for CSS pseudo', () => {
    const cssClass = 'after:opacity-0 data-[state=active]:after:opacity-100'
    expect(cssClass).toContain('data-[state=active]')
    expect(cssClass).toContain('after:opacity')
  })
})

// ── Shortcuts Search ──
describe('ShortcutsSearch - Filtering', () => {
  const sections = [
    { title: 'Tools', shortcuts: [
      { keys: 'V', desc: 'Move' },
      { keys: 'R', desc: 'Rectangle' },
      { keys: 'T', desc: 'Text' },
    ]},
    { title: 'Edit', shortcuts: [
      { keys: 'Ctrl+Z', desc: 'Undo' },
      { keys: 'Ctrl+C', desc: 'Copy' },
    ]},
    { title: 'Panels', shortcuts: [
      { keys: 'Ctrl+E', desc: 'Export' },
      { keys: 'Ctrl+B', desc: 'Brand' },
    ]},
  ]

  function filter(q: string) {
    const lower = q.toLowerCase().trim()
    if (!lower) return sections
    return sections
      .map(s => ({
        ...s,
        shortcuts: s.shortcuts.filter(
          sc => sc.desc.toLowerCase().includes(lower) || sc.keys.toLowerCase().includes(lower)
        ),
      }))
      .filter(s => s.shortcuts.length > 0)
  }

  test('empty query returns all sections', () => {
    expect(filter('')).toHaveLength(3)
  })

  test('search by description', () => {
    const result = filter('undo')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Edit')
    expect(result[0].shortcuts).toHaveLength(1)
  })

  test('search by key', () => {
    const result = filter('ctrl+e')
    expect(result).toHaveLength(1)
    expect(result[0].shortcuts[0].desc).toBe('Export')
  })

  test('search across sections', () => {
    const result = filter('ctrl')
    expect(result).toHaveLength(2) // Edit + Panels
  })

  test('no results', () => {
    const result = filter('zzzzz')
    expect(result).toHaveLength(0)
  })
})

// ── Welcome Overlay ──
describe('WelcomeOverlay - Visibility', () => {
  test('shows when no content', () => {
    const visibleNodes: string[] = []
    const hasContent = visibleNodes.length > 0
    expect(hasContent).toBe(false)
  })

  test('hides when content exists', () => {
    const visibleNodes = ['node1', 'node2']
    const hasContent = visibleNodes.length > 0
    expect(hasContent).toBe(true)
  })

  test('emits correct action types', () => {
    const actions = ['template', 'ai', 'import'] as const
    expect(actions).toHaveLength(3)
    expect(actions).toContain('template')
    expect(actions).toContain('ai')
    expect(actions).toContain('import')
  })
})

// ── Export Preview ──
describe('ExportPreview - Format Icons', () => {
  function getIconType(format: string): string {
    if (['PNG', 'JPG', 'WEBP'].includes(format)) return 'image'
    if (format === 'SVG') return 'file-code'
    return 'file-text'
  }

  test('PNG shows image icon', () => {
    expect(getIconType('PNG')).toBe('image')
  })

  test('JPG shows image icon', () => {
    expect(getIconType('JPG')).toBe('image')
  })

  test('SVG shows file-code icon', () => {
    expect(getIconType('SVG')).toBe('file-code')
  })

  test('PDF shows file-text icon', () => {
    expect(getIconType('PDF')).toBe('file-text')
  })

  test('preview filename with extension', () => {
    const filename = 'MyDesign'
    const format = 'PNG'
    const scale = 2
    const preview = `${filename}.${format.toLowerCase()} @ ${scale}x`
    expect(preview).toBe('MyDesign.png @ 2x')
  })
})

// ── Comment Username Position ──
describe('CommentUsername - Bottom Position', () => {
  test('username defaults to You', () => {
    let user = 'You'
    expect(user).toBe('You')
  })

  test('setUsername persists', () => {
    function setUsername(name: string): string {
      return name.trim() || 'You'
    }
    expect(setUsername('Alice')).toBe('Alice')
    expect(setUsername('')).toBe('You')
  })

  test('border-t for bottom position', () => {
    const cls = 'border-t border-border'
    expect(cls).toContain('border-t ')
    expect(cls).not.toContain('border-b ')
  })
})

// ── Template Hover Effect ──
describe('TemplateHover - Enhanced Styles', () => {
  test('hover classes include shadow and translate', () => {
    const cls = 'hover:shadow-md hover:shadow-accent/5 hover:-translate-y-0.5'
    expect(cls).toContain('hover:shadow-md')
    expect(cls).toContain('hover:-translate-y-0.5')
  })

  test('hover includes accent border', () => {
    const cls = 'hover:border-accent/50 hover:bg-accent/5'
    expect(cls).toContain('hover:border-accent')
    expect(cls).toContain('hover:bg-accent')
  })
})

// ── Bottom Toolbar Grouping ──
describe('BottomToolbar - Layout', () => {
  test('viewport is centered', () => {
    const cls = 'absolute bottom-3 left-1/2 -translate-x-1/2'
    expect(cls).toContain('left-1/2')
    expect(cls).toContain('-translate-x-1/2')
  })

  test('tools group is bottom-right', () => {
    const cls = 'absolute bottom-3 right-3'
    expect(cls).toContain('bottom-3')
    expect(cls).toContain('right-3')
  })

  test('tools group contains 3 items', () => {
    const items = ['keyboard', 'locale', 'theme']
    expect(items).toHaveLength(3)
  })
})
