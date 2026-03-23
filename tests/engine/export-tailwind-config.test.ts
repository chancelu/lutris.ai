import { describe, test, expect } from 'bun:test'
import { buildTailwindConfig } from '../../packages/core/src/tools/export-tailwind-config'

describe('buildTailwindConfig', () => {
  test('generates valid config with all token types', () => {
    const config = buildTailwindConfig({
      colors: [
        { name: 'primary', hex: '#3B82F6', count: 10 },
        { name: 'secondary', hex: '#10B981', count: 5 }
      ],
      typography: [
        { family: 'Inter', sizes: [14, 16, 24] },
        { family: 'Mono', sizes: [14] }
      ],
      spacing: [
        { value: 8, count: 20 },
        { value: 16, count: 15 },
        { value: 24, count: 5 }
      ],
      borderRadius: [4, 8, 12]
    })

    expect(config).toContain("export default {")
    expect(config).toContain("colors: {")
    expect(config).toContain("'primary': '#3B82F6'")
    expect(config).toContain("'secondary': '#10B981'")
    expect(config).toContain("fontFamily: {")
    expect(config).toContain("'inter': ['Inter', 'sans-serif']")
    expect(config).toContain("'mono': ['Mono', 'sans-serif']")
    expect(config).toContain("fontSize: {")
    expect(config).toContain("'14': '14px'")
    expect(config).toContain("'16': '16px'")
    expect(config).toContain("'24': '24px'")
    expect(config).toContain("spacing: {")
    expect(config).toContain("'8': '8px'")
    expect(config).toContain("'16': '16px'")
    expect(config).toContain("borderRadius: {")
    expect(config).toContain("'4': '4px'")
    expect(config).toContain("'12': '12px'")
  })

  test('handles empty tokens gracefully', () => {
    const config = buildTailwindConfig({
      colors: [],
      typography: [],
      spacing: [],
      borderRadius: []
    })

    expect(config).toContain("export default {")
    expect(config).toContain("theme: {")
    expect(config).toContain("extend: {")
    expect(config).not.toContain("colors:")
    expect(config).not.toContain("fontFamily:")
    expect(config).not.toContain("fontSize:")
    expect(config).not.toContain("spacing:")
    expect(config).not.toContain("borderRadius:")
  })

  test('applies prefix to color keys', () => {
    const config = buildTailwindConfig({
      colors: [{ name: 'primary', hex: '#3B82F6', count: 1 }],
      typography: [],
      spacing: [],
      borderRadius: [],
      prefix: 'brand'
    })

    expect(config).toContain("'brand-primary': '#3B82F6'")
  })

  test('sanitizes keys with special characters', () => {
    const config = buildTailwindConfig({
      colors: [{ name: 'Primary / Blue 500', hex: '#3B82F6', count: 1 }],
      typography: [{ family: 'SF Pro Display', sizes: [16] }],
      spacing: [],
      borderRadius: []
    })

    expect(config).toContain("'primary-blue-500': '#3B82F6'")
    expect(config).toContain("'sf-pro-display':")
  })

  test('deduplicates font sizes across families', () => {
    const config = buildTailwindConfig({
      colors: [],
      typography: [
        { family: 'Inter', sizes: [14, 16] },
        { family: 'Mono', sizes: [14, 20] }
      ],
      spacing: [],
      borderRadius: []
    })

    // 14 should appear only once in fontSize
    const matches = config.match(/'14': '14px'/g)
    expect(matches).toHaveLength(1)
  })

  test('sorts font sizes ascending', () => {
    const config = buildTailwindConfig({
      colors: [],
      typography: [{ family: 'Inter', sizes: [24, 12, 16] }],
      spacing: [],
      borderRadius: []
    })

    const idx12 = config.indexOf("'12': '12px'")
    const idx16 = config.indexOf("'16': '16px'")
    const idx24 = config.indexOf("'24': '24px'")
    expect(idx12).toBeLessThan(idx16)
    expect(idx16).toBeLessThan(idx24)
  })

  test('includes JSDoc type annotation', () => {
    const config = buildTailwindConfig({
      colors: [],
      typography: [],
      spacing: [],
      borderRadius: []
    })

    expect(config).toContain("/** @type {import('tailwindcss').Config} */")
  })

  test('hex color names are sanitized as keys', () => {
    const config = buildTailwindConfig({
      colors: [{ name: '#FF5733', hex: '#FF5733', count: 3 }],
      typography: [],
      spacing: [],
      borderRadius: []
    })

    // hex should be cleaned to a valid key (no leading #)
    expect(config).toContain("'ff5733': '#FF5733'")
    expect(config).not.toContain("'#ff5733'")
  })
})
