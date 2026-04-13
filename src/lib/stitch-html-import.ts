/**
 * Stitch HTML → Lutris.ai SceneNode converter
 *
 * Converts Stitch-generated HTML (Tailwind CSS) into scene graph nodes.
 */

import type { SceneGraph } from '@open-pencil/core'

interface ImportResult {
  rootId: string
  nodeCount: number
}

// Tailwind color map (subset of common colors)
const TW_COLORS: Record<string, string> = {
  'white': '#FFFFFF', 'black': '#000000',
  'slate-50': '#F8FAFC', 'slate-100': '#F1F5F9', 'slate-200': '#E2E8F0',
  'slate-300': '#CBD5E1', 'slate-400': '#94A3B8', 'slate-500': '#64748B',
  'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1E293B',
  'slate-900': '#0F172A', 'slate-950': '#020617',
  'gray-50': '#F9FAFB', 'gray-100': '#F3F4F6', 'gray-200': '#E5E7EB',
  'gray-300': '#D1D5DB', 'gray-400': '#9CA3AF', 'gray-500': '#6B7280',
  'gray-600': '#4B5563', 'gray-700': '#374151', 'gray-800': '#1F2937',
  'gray-900': '#111827', 'gray-950': '#030712',
  'red-500': '#EF4444', 'red-600': '#DC2626',
  'blue-500': '#3B82F6', 'blue-600': '#2563EB',
  'green-500': '#22C55E', 'green-600': '#16A34A',
  'yellow-500': '#EAB308', 'purple-500': '#A855F7',
  'pink-500': '#EC4899', 'indigo-500': '#6366F1',
  'indigo-600': '#4F46E5', 'indigo-700': '#4338CA',
}

/** Parse a hex color string to RGBA (0-1 range) */
function hexToColor(hex: string): { r: number; g: number; b: number; a: number } {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
  return { r, g, b, a }
}

/** Resolve a Tailwind color class to hex */
function resolveTwColor(name: string): string | null {
  if (name.startsWith('[#')) return name.slice(1, -1) // arbitrary value [#hex]
  return TW_COLORS[name] ?? null
}

/** Extract numeric value from Tailwind spacing class (e.g. "p-4" → 16) */
function twSpacing(val: string): number {
  if (val.startsWith('[')) return parseInt(val.slice(1, -1), 10) || 0
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n * 4 // Tailwind spacing scale: 1 unit = 4px
}

/** Extract font size from Tailwind text-* class */
function twFontSize(cls: string): number | null {
  const map: Record<string, number> = {
    'xs': 12, 'sm': 14, 'base': 16, 'lg': 18, 'xl': 20,
    '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60,
  }
  return map[cls] ?? null
}

/** Extract rounded value */
function twRounded(val: string | undefined): number {
  if (!val || val === '') return 8
  const map: Record<string, number> = {
    'none': 0, 'sm': 2, 'md': 6, 'lg': 8, 'xl': 12, '2xl': 16, '3xl': 24, 'full': 9999,
  }
  return map[val] ?? (parseInt(val, 10) || 8)
}

interface NodeOverrides {
  name?: string
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
  primaryAxisAlign?: string
  counterAxisAlign?: string
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  itemSpacing?: number
  width?: number
  height?: number
  fills?: Array<Record<string, unknown>>
  cornerRadius?: number
  text?: string
  fontSize?: number
  fontWeight?: number
  textAlignHorizontal?: string
}

/** Parse Tailwind classes into node overrides */
function parseClasses(classList: string[]): NodeOverrides {
  const o: NodeOverrides = {}

  for (const cls of classList) {
    // Flex direction
    if (cls === 'flex') o.layoutMode = o.layoutMode ?? 'HORIZONTAL'
    else if (cls === 'flex-col') o.layoutMode = 'VERTICAL'
    else if (cls === 'flex-row') o.layoutMode = 'HORIZONTAL'
    else if (cls === 'inline-flex') o.layoutMode = o.layoutMode ?? 'HORIZONTAL'

    // Justify
    else if (cls === 'justify-center') o.primaryAxisAlign = 'CENTER'
    else if (cls === 'justify-between') o.primaryAxisAlign = 'SPACE_BETWEEN'
    else if (cls === 'justify-end') o.primaryAxisAlign = 'MAX'
    else if (cls === 'justify-start') o.primaryAxisAlign = 'MIN'

    // Align items
    else if (cls === 'items-center') o.counterAxisAlign = 'CENTER'
    else if (cls === 'items-start') o.counterAxisAlign = 'MIN'
    else if (cls === 'items-end') o.counterAxisAlign = 'MAX'
    else if (cls === 'items-stretch') o.counterAxisAlign = 'STRETCH'

    // Gap
    else if (cls.startsWith('gap-')) o.itemSpacing = twSpacing(cls.slice(4))

    // Padding
    else if (cls.startsWith('p-')) {
      const v = twSpacing(cls.slice(2))
      o.paddingTop = v; o.paddingRight = v; o.paddingBottom = v; o.paddingLeft = v
    }
    else if (cls.startsWith('px-')) { const v = twSpacing(cls.slice(3)); o.paddingLeft = v; o.paddingRight = v }
    else if (cls.startsWith('py-')) { const v = twSpacing(cls.slice(3)); o.paddingTop = v; o.paddingBottom = v }
    else if (cls.startsWith('pt-')) o.paddingTop = twSpacing(cls.slice(3))
    else if (cls.startsWith('pr-')) o.paddingRight = twSpacing(cls.slice(3))
    else if (cls.startsWith('pb-')) o.paddingBottom = twSpacing(cls.slice(3))
    else if (cls.startsWith('pl-')) o.paddingLeft = twSpacing(cls.slice(3))

    // Size
    else if (cls.startsWith('w-') && !cls.startsWith('w-full')) {
      const v = twSpacing(cls.slice(2)); if (v > 0) o.width = v
    }
    else if (cls === 'w-full') o.width = undefined // fill parent
    else if (cls.startsWith('h-') && !cls.startsWith('h-full')) {
      const v = twSpacing(cls.slice(2)); if (v > 0) o.height = v
    }

    // Background
    else if (cls.startsWith('bg-')) {
      const hex = resolveTwColor(cls.slice(3))
      if (hex) o.fills = [{ type: 'SOLID', color: hexToColor(hex), visible: true, opacity: 1 }]
    }

    // Rounded
    else if (cls === 'rounded' || cls.startsWith('rounded-')) {
      o.cornerRadius = twRounded(cls.includes('-') ? cls.split('-').slice(1).join('-') : undefined)
    }

    // Font size
    else if (cls.startsWith('text-') && !cls.startsWith('text-center') && !cls.startsWith('text-left') && !cls.startsWith('text-right')) {
      const size = twFontSize(cls.slice(5))
      if (size) o.fontSize = size
    }

    // Text align
    else if (cls === 'text-center') o.textAlignHorizontal = 'CENTER'
    else if (cls === 'text-right') o.textAlignHorizontal = 'RIGHT'
    else if (cls === 'text-left') o.textAlignHorizontal = 'LEFT'

    // Font weight
    else if (cls === 'font-bold') o.fontWeight = 700
    else if (cls === 'font-semibold') o.fontWeight = 600
    else if (cls === 'font-medium') o.fontWeight = 500
    else if (cls === 'font-light') o.fontWeight = 300

    // Text color (applied as fill for TEXT nodes)
    else if (cls.startsWith('text-') && resolveTwColor(cls.slice(5))) {
      const hex = resolveTwColor(cls.slice(5))!
      o.fills = [{ type: 'SOLID', color: hexToColor(hex), visible: true, opacity: 1 }]
    }
  }

  return o
}

/** Map HTML tag to SceneNode type */
function tagToNodeType(tag: string, el: Element): 'FRAME' | 'TEXT' | 'RECTANGLE' {
  if (tag === 'IMG') return 'RECTANGLE'
  // Only treat as TEXT if it's a leaf node (no child elements)
  const textTags = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'A', 'LABEL'])
  if (textTags.has(tag) && el.children.length === 0) return 'TEXT'
  // BUTTON with children → FRAME so children are preserved
  return el.children.length > 0 ? 'FRAME' : (textTags.has(tag) ? 'TEXT' : 'FRAME')
}

/** Default font sizes for heading tags */
function headingFontSize(tag: string): number | undefined {
  const map: Record<string, number> = { H1: 36, H2: 30, H3: 24, H4: 20, H5: 18, H6: 16 }
  return map[tag]
}

/** Recursively convert a DOM element to scene nodes */
function convertElement(el: Element, parentId: string, graph: SceneGraph, depth: number): number {
  if (depth > 20) return 0 // safety limit

  const tag = el.tagName
  const classes = Array.from(el.classList)
  const overrides = parseClasses(classes)
  const nodeType = tagToNodeType(tag, el)

  let created = 0

  if (nodeType === 'TEXT') {
    const text = el.textContent?.trim() || ''
    if (!text) return 0
    const headingSize = headingFontSize(tag)
    const node = graph.createNode('TEXT', parentId, {
      name: text.slice(0, 40),
      text,
      ...(overrides.fontSize ? { fontSize: overrides.fontSize } : headingSize ? { fontSize: headingSize } : {}),
      ...(overrides.fontWeight ? { fontWeight: overrides.fontWeight } : tag === 'H1' || tag === 'H2' ? { fontWeight: 700 } : {}),
      ...(overrides.textAlignHorizontal ? { textAlignHorizontal: overrides.textAlignHorizontal } : {}),
      ...(overrides.fills ? { fills: overrides.fills as never } : {}),
    })
    void node
    return 1
  }

  // FRAME or RECTANGLE (img)
  if (nodeType === 'RECTANGLE' && tag === 'IMG') {
    const src = el.getAttribute('src')
    const alt = el.getAttribute('alt') || 'Image'
    const fills = src
      ? [{ type: 'IMAGE' as const, imageHash: src, imageScaleMode: 'FILL', visible: true, opacity: 1 }]
      : [{ type: 'SOLID' as const, color: { r: 0.85, g: 0.85, b: 0.85, a: 1 }, visible: true, opacity: 1 }]
    graph.createNode('RECTANGLE', parentId, {
      name: alt.slice(0, 40),
      width: overrides.width ?? 200,
      height: overrides.height ?? 150,
      fills: fills as never,
      cornerRadius: overrides.cornerRadius ?? 0,
    })
    return 1
  }

  // FRAME — container element
  const frame = graph.createNode('FRAME', parentId, {
    name: el.getAttribute('data-name') || tag.toLowerCase(),
    layoutMode: overrides.layoutMode ?? 'VERTICAL',
    ...(overrides.primaryAxisAlign ? { primaryAxisAlign: overrides.primaryAxisAlign } : {}),
    ...(overrides.counterAxisAlign ? { counterAxisAlign: overrides.counterAxisAlign } : {}),
    ...(overrides.paddingTop != null ? { paddingTop: overrides.paddingTop } : {}),
    ...(overrides.paddingRight != null ? { paddingRight: overrides.paddingRight } : {}),
    ...(overrides.paddingBottom != null ? { paddingBottom: overrides.paddingBottom } : {}),
    ...(overrides.paddingLeft != null ? { paddingLeft: overrides.paddingLeft } : {}),
    ...(overrides.itemSpacing != null ? { itemSpacing: overrides.itemSpacing } : {}),
    ...(overrides.width ? { width: overrides.width } : {}),
    ...(overrides.height ? { height: overrides.height } : {}),
    ...(overrides.fills ? { fills: overrides.fills as never } : {}),
    ...(overrides.cornerRadius ? { cornerRadius: overrides.cornerRadius } : {}),
  })
  created = 1

  // Recurse children
  for (const child of Array.from(el.children)) {
    created += convertElement(child, frame.id, graph, depth + 1)
  }

  // If frame has no child nodes but has text content, add a TEXT child
  if (el.children.length === 0 && el.textContent?.trim()) {
    const text = el.textContent.trim()
    graph.createNode('TEXT', frame.id, { name: text.slice(0, 40), text })
    created++
  }

  return created
}

/**
 * Import Stitch HTML into the scene graph under the given parent.
 */
export function importStitchHtml(html: string, parentId: string, graph: SceneGraph): ImportResult {
  // Stitch may return HTML wrapped in markdown code blocks — extract it
  let cleaned = html.trim()
  const mdMatch = cleaned.match(/```(?:html)?\s*\n([\s\S]*?)```/)
  if (mdMatch) cleaned = mdMatch[1].trim()

  // If it looks like JSON wrapping HTML, try to extract
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned)
      const candidate = parsed.html || parsed.code || parsed.content
      if (typeof candidate === 'string' && candidate.includes('<')) cleaned = candidate
    } catch { /* not JSON, use as-is */ }
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(cleaned, 'text/html')

  // Find the root element — skip <html><head><body> wrapper
  const body = doc.body
  const rootEl = body.children.length === 1 ? body.children[0] : body

  // Create a wrapper frame for the imported content
  const wrapper = graph.createNode('FRAME', parentId, {
    name: 'Stitch Import',
    layoutMode: 'VERTICAL',
    width: 375,
    height: 812,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    itemSpacing: 0,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'FIXED',
  })

  let nodeCount = 1
  if (rootEl === body) {
    for (const child of Array.from(body.children)) {
      nodeCount += convertElement(child, wrapper.id, graph, 0)
    }
  } else {
    nodeCount += convertElement(rootEl, wrapper.id, graph, 0)
  }

  return { rootId: wrapper.id, nodeCount }
}