import { ref } from 'vue'

// ── Theme System ──
// Dark/Light/System theme switching with CSS class toggle

export type Theme = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'designflow-theme'

const theme = ref<Theme>('dark')
const resolvedTheme = ref<'dark' | 'light'>('dark')

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(t: 'dark' | 'light') {
  resolvedTheme.value = t
  const root = document.documentElement
  if (t === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
}

function setTheme(t: Theme) {
  theme.value = t
  try {
    localStorage.setItem(STORAGE_KEY, t)
  } catch { /* ignore */ }

  if (t === 'system') {
    applyTheme(getSystemTheme())
  } else {
    applyTheme(t)
  }
}

function toggleTheme() {
  const order: Theme[] = ['dark', 'light', 'system']
  const idx = order.indexOf(theme.value)
  setTheme(order[(idx + 1) % order.length])
}

// Init
try {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored && ['dark', 'light', 'system'].includes(stored)) {
    theme.value = stored
  }
} catch { /* ignore */ }

if (theme.value === 'system') {
  applyTheme(getSystemTheme())
} else {
  applyTheme(theme.value)
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme.value === 'system') {
      applyTheme(getSystemTheme())
    }
  })
}

export function useTheme() {
  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  }
}
