import { colorToHex } from '../color'
import { defineTool } from './schema'


interface ColorToken {
  name: string
  hex: string
  count: number
}

interface TypographyToken {
  family: string
  sizes: number[]
}

interface SpacingToken {
  value: number
  count: number
}

/**
 * Build a Tailwind v4 config object from scene graph analysis.
 * Pure function — takes extracted tokens, returns a config string.
 */
export function buildTailwindConfig(opts: {
  colors: ColorToken[]
  typography: TypographyToken[]
  spacing: SpacingToken[]
  borderRadius: number[]
  prefix?: string
}): string {
  const { colors, typography, spacing, borderRadius, prefix } = opts
  const lines: string[] = [
    '/** @type {import(\'tailwindcss\').Config} */',
    'export default {',
    '  theme: {',
    '    extend: {'
  ]

  // Colors
  if (colors.length > 0) {
    lines.push('      colors: {')
    for (const c of colors) {
      const key = sanitizeKey(c.name, prefix)
      lines.push(`        '${key}': '${c.hex}',`)
    }
    lines.push('      },')
  }

  // Font families
  const families = [...new Set(typography.map((t) => t.family))].filter(Boolean)
  if (families.length > 0) {
    lines.push('      fontFamily: {')
    for (const family of families) {
      const key = sanitizeKey(family, prefix)
      lines.push(`        '${key}': ['${family}', 'sans-serif'],`)
    }
    lines.push('      },')
  }

  // Font sizes
  const allSizes = [...new Set(typography.flatMap((t) => t.sizes))].sort((a, b) => a - b)
  if (allSizes.length > 0) {
    lines.push('      fontSize: {')
    for (const size of allSizes) {
      lines.push(`        '${size}': '${size}px',`)
    }
    lines.push('      },')
  }

  // Spacing
  if (spacing.length > 0) {
    lines.push('      spacing: {')
    for (const s of spacing) {
      lines.push(`        '${s.value}': '${s.value}px',`)
    }
    lines.push('      },')
  }

  // Border radius
  if (borderRadius.length > 0) {
    lines.push('      borderRadius: {')
    for (const r of borderRadius) {
      lines.push(`        '${r}': '${r}px',`)
    }
    lines.push('      },')
  }

  lines.push('    },')
  lines.push('  },')
  lines.push('}')

  return lines.join('\n')
}

function sanitizeKey(name: string, prefix?: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return prefix ? `${prefix}-${clean}` : clean
}

/**
 * Extract color tokens from the scene graph.
 */
function extractColors(figma: { currentPage: any; graph: any }): ColorToken[] {
  const colorMap = new Map<string, ColorToken>()

  figma.currentPage.findAll((node: any) => {
    const raw = figma.graph.getNode(node.id)
    if (!raw) return false

    const boundVars = raw.boundVariables
    for (const fill of raw.fills) {
      if (fill.type === 'SOLID' && fill.visible) {
        const hex = colorToHex(fill.color)
        const varName = boundVars['fills'] ? String(boundVars['fills']) : null
        const name = varName ?? hex
        const entry = colorMap.get(hex)
        if (entry) {
          entry.count++
          if (varName && entry.name === hex) entry.name = varName
        } else {
          colorMap.set(hex, { name, hex, count: 1 })
        }
      }
    }
    for (const stroke of raw.strokes) {
      if (stroke.visible) {
        const hex = colorToHex(stroke.color)
        const varName = boundVars['strokes'] ? String(boundVars['strokes']) : null
        const name = varName ?? hex
        const entry = colorMap.get(hex)
        if (entry) {
          entry.count++
          if (varName && entry.name === hex) entry.name = varName
        } else {
          colorMap.set(hex, { name, hex, count: 1 })
        }
      }
    }
    return false
  })

  return [...colorMap.values()].sort((a, b) => b.count - a.count)
}

/**
 * Extract typography tokens from the scene graph.
 */
function extractTypography(figma: { currentPage: any; graph: any }): TypographyToken[] {
  const familyMap = new Map<string, Set<number>>()

  figma.currentPage.findAll((node: any) => {
    if (node.type !== 'TEXT') return false
    const raw = figma.graph.getNode(node.id)
    if (!raw) return false

    const family = raw.fontFamily
    if (!family) return false

    const sizes = familyMap.get(family) ?? new Set<number>()
    sizes.add(raw.fontSize)
    familyMap.set(family, sizes)
    return false
  })

  return [...familyMap.entries()].map(([family, sizes]) => ({
    family,
    sizes: [...sizes].sort((a, b) => a - b)
  }))
}

/**
 * Extract spacing tokens from the scene graph.
 */
function extractSpacing(figma: { currentPage: any; graph: any }): SpacingToken[] {
  const spacingMap = new Map<number, number>()

  figma.currentPage.findAll((node: any) => {
    const raw = figma.graph.getNode(node.id)
    if (!raw) return false

    if (raw.layoutMode !== 'NONE' && raw.itemSpacing > 0) {
      spacingMap.set(raw.itemSpacing, (spacingMap.get(raw.itemSpacing) ?? 0) + 1)
    }
    for (const p of [raw.paddingTop, raw.paddingRight, raw.paddingBottom, raw.paddingLeft]) {
      if (p > 0) {
        spacingMap.set(p, (spacingMap.get(p) ?? 0) + 1)
      }
    }
    return false
  })

  return [...spacingMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, count }))
}

/**
 * Extract border radius values from the scene graph.
 */
function extractBorderRadius(figma: { currentPage: any; graph: any }): number[] {
  const radii = new Set<number>()

  figma.currentPage.findAll((node: any) => {
    const raw = figma.graph.getNode(node.id)
    if (!raw) return false

    for (const r of [raw.topLeftRadius, raw.topRightRadius, raw.bottomRightRadius, raw.bottomLeftRadius]) {
      if (r > 0) radii.add(r)
    }
    return false
  })

  return [...radii].sort((a, b) => a - b)
}

// ─── Tool definition ─────────────────────────────────────────

export const exportTailwindConfig = defineTool({
  name: 'export_tailwind_config',
  description:
    'Generate a Tailwind CSS config from the current page\'s design tokens — colors, typography, spacing, and border radius.',
  params: {
    prefix: {
      type: 'string',
      description: 'Optional prefix for token keys (e.g. "brand")'
    }
  },
  execute: (figma, args) => {
    const colors = extractColors(figma)
    const typography = extractTypography(figma)
    const spacing = extractSpacing(figma)
    const borderRadius = extractBorderRadius(figma)

    const config = buildTailwindConfig({
      colors,
      typography,
      spacing,
      borderRadius,
      prefix: args.prefix
    })

    return {
      config,
      summary: {
        colors: colors.length,
        fontFamilies: [...new Set(typography.map((t) => t.family))].length,
        fontSizes: [...new Set(typography.flatMap((t) => t.sizes))].length,
        spacingValues: spacing.length,
        borderRadiusValues: borderRadius.length
      }
    }
  }
})
