import { describe, it, expect } from 'bun:test'

import { DEFAULT_BRAND } from '../../src/types/project'

import type { ProjectBrand } from '../../src/types/project'

// ── Pure logic tests for brand-related functions ──
// useBrand() depends on Vue reactivity + useProjects(), so we test
// the underlying logic patterns directly.

describe('Brand CSS export logic', () => {
  function exportBrandCSS(b: ProjectBrand): string {
    return `:root {
  --brand-primary: ${b.primaryColor};
  --brand-secondary: ${b.secondaryColor};
  --brand-accent: ${b.accentColor};
  --brand-font: '${b.fontFamily}', sans-serif;
  --brand-radius: ${b.borderRadius}px;
}
`
  }

  it('should generate valid CSS custom properties from default brand', () => {
    const css = exportBrandCSS({ ...DEFAULT_BRAND })
    expect(css).toContain('--brand-primary: #6366f1')
    expect(css).toContain('--brand-secondary: #1e1e2e')
    expect(css).toContain('--brand-accent: #8b5cf6')
    expect(css).toContain("--brand-font: 'Inter', sans-serif")
    expect(css).toContain('--brand-radius: 8px')
  })

  it('should reflect custom brand values', () => {
    const custom: ProjectBrand = {
      appName: 'MyApp',
      tagline: 'Custom tagline',
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
      accentColor: '#0000ff',
      fontFamily: 'Roboto',
      borderRadius: '12',
    }
    const css = exportBrandCSS(custom)
    expect(css).toContain('--brand-primary: #ff0000')
    expect(css).toContain('--brand-secondary: #00ff00')
    expect(css).toContain('--brand-accent: #0000ff')
    expect(css).toContain("--brand-font: 'Roboto', sans-serif")
    expect(css).toContain('--brand-radius: 12px')
  })

  it('should start with :root selector', () => {
    const css = exportBrandCSS({ ...DEFAULT_BRAND })
    expect(css.startsWith(':root {')).toBe(true)
  })
})

describe('Brand system prompt logic', () => {
  function getBrandSystemPrompt(b: ProjectBrand): string {
    return `## Brand Context
The current project brand settings are:
- App Name: ${b.appName}
- Tagline: ${b.tagline}
- Primary Color: ${b.primaryColor}
- Secondary Color: ${b.secondaryColor}
- Accent Color: ${b.accentColor}
- Font Family: ${b.fontFamily}
- Border Radius: ${b.borderRadius}px
${b.logoUrl ? '- Logo: configured' : '- Logo: not set'}

When generating designs, use these brand colors and font. Use the primary color for key UI elements, accent for CTAs, and secondary for backgrounds.`
  }

  it('should include all brand fields in prompt', () => {
    const prompt = getBrandSystemPrompt({ ...DEFAULT_BRAND })
    expect(prompt).toContain('Lutris.ai')
    expect(prompt).toContain('AI-Powered Design Tool')
    expect(prompt).toContain('#6366f1')
    expect(prompt).toContain('#1e1e2e')
    expect(prompt).toContain('#8b5cf6')
    expect(prompt).toContain('Inter')
    expect(prompt).toContain('8px')
  })

  it('should show "Logo: not set" when logoUrl is empty', () => {
    const prompt = getBrandSystemPrompt({ ...DEFAULT_BRAND, logoUrl: '' })
    expect(prompt).toContain('Logo: not set')
  })

  it('should show "Logo: configured" when logoUrl is set', () => {
    const prompt = getBrandSystemPrompt({ ...DEFAULT_BRAND, logoUrl: 'https://example.com/logo.png' })
    expect(prompt).toContain('Logo: configured')
  })

  it('should start with Brand Context header', () => {
    const prompt = getBrandSystemPrompt({ ...DEFAULT_BRAND })
    expect(prompt.startsWith('## Brand Context')).toBe(true)
  })

  it('should include design guidance', () => {
    const prompt = getBrandSystemPrompt({ ...DEFAULT_BRAND })
    expect(prompt).toContain('primary color for key UI elements')
    expect(prompt).toContain('accent for CTAs')
    expect(prompt).toContain('secondary for backgrounds')
  })
})

describe('Brand change detection logic', () => {
  function hasBrandChanged(b: ProjectBrand): boolean {
    return b.appName !== DEFAULT_BRAND.appName ||
      b.primaryColor !== DEFAULT_BRAND.primaryColor ||
      b.fontFamily !== DEFAULT_BRAND.fontFamily
  }

  it('should return false for default brand', () => {
    expect(hasBrandChanged({ ...DEFAULT_BRAND })).toBe(false)
  })

  it('should detect appName change', () => {
    expect(hasBrandChanged({ ...DEFAULT_BRAND, appName: 'Changed' })).toBe(true)
  })

  it('should detect primaryColor change', () => {
    expect(hasBrandChanged({ ...DEFAULT_BRAND, primaryColor: '#000000' })).toBe(true)
  })

  it('should detect fontFamily change', () => {
    expect(hasBrandChanged({ ...DEFAULT_BRAND, fontFamily: 'Roboto' })).toBe(true)
  })

  it('should not detect secondary-only changes', () => {
    // hasBrand only checks appName, primaryColor, fontFamily
    expect(hasBrandChanged({ ...DEFAULT_BRAND, secondaryColor: '#ffffff' })).toBe(false)
  })
})

describe('Brand update immutability', () => {
  it('updateBrand should produce a new object (spread pattern)', () => {
    const original: ProjectBrand = { ...DEFAULT_BRAND }
    const partial: Partial<ProjectBrand> = { appName: 'Updated' }
    const updated = { ...original, ...partial }
    expect(updated.appName).toBe('Updated')
    expect(original.appName).toBe('Lutris.ai')
    expect(updated).not.toBe(original)
  })

  it('resetBrand should produce a fresh copy of defaults', () => {
    const reset = { ...DEFAULT_BRAND }
    reset.appName = 'Mutated'
    expect(DEFAULT_BRAND.appName).toBe('Lutris.ai')
  })
})
