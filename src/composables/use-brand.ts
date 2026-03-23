import { computed, watch } from 'vue'

import { useProjects } from './use-projects'

import type { ProjectBrand } from '@/types/project'
import { DEFAULT_BRAND } from '@/types/project'

// ── Per-Project Brand Composable ──
// Thin wrapper around useProjects().activeBrand.
// Provides getBrandSystemPrompt() for AI context injection.

export function useBrand() {
  const { activeBrand, saveActiveProjectData } = useProjects()

  const config = activeBrand

  function updateBrand(partial: Partial<ProjectBrand>): void {
    activeBrand.value = { ...activeBrand.value, ...partial }
  }

  function resetBrand(): void {
    activeBrand.value = { ...DEFAULT_BRAND }
  }

  function exportBrandCSS(): string {
    const b = config.value
    return `:root {
  --brand-primary: ${b.primaryColor};
  --brand-secondary: ${b.secondaryColor};
  --brand-accent: ${b.accentColor};
  --brand-font: '${b.fontFamily}', sans-serif;
  --brand-radius: ${b.borderRadius}px;
}
`
  }

  /** Generate a system prompt fragment describing the brand for AI context. */
  function getBrandSystemPrompt(): string {
    const b = config.value
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

  const hasBrand = computed(() => {
    const b = config.value
    return b.appName !== DEFAULT_BRAND.appName ||
      b.primaryColor !== DEFAULT_BRAND.primaryColor ||
      b.fontFamily !== DEFAULT_BRAND.fontFamily
  })

  // Auto-persist on changes (debounced via project save)
  let saveTimeout: number | null = null
  watch(config, () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = window.setTimeout(() => {
      void saveActiveProjectData()
    }, 1000)
  }, { deep: true })

  return {
    config,
    updateBrand,
    resetBrand,
    exportBrandCSS,
    getBrandSystemPrompt,
    hasBrand,
  }
}
