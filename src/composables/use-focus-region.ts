import { ref } from 'vue'

/**
 * Tracks which top-level UI region the user is currently interacting with:
 * left sidebar (layers/design properties), center (canvas), or right panel
 * (AI chat / spec / export). Regions are marked in the DOM with
 * `data-region="left" | "canvas" | "right"` on their top-level wrapper in
 * EditorView.vue.
 *
 * This feeds `buildDynamicPrompt()` in use-chat.ts so the AI knows whether
 * the user was just typing in the chat box, editing layer properties on the
 * left, or interacting with the design canvas — instead of guessing from
 * message text alone.
 */

export type FocusRegion = 'left' | 'canvas' | 'right' | null

const currentRegion = ref<FocusRegion>(null)
let initialized = false

function regionOf(el: EventTarget | null): FocusRegion {
  if (!(el instanceof Element)) return null
  const region = el.closest('[data-region]')
  const value = region?.getAttribute('data-region')
  if (value === 'left' || value === 'canvas' || value === 'right') return value
  return null
}

function initFocusRegionTracking(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  // focusin covers keyboard/mouse focus on inputs, textareas, contenteditable, etc.
  window.addEventListener('focusin', (e) => {
    const region = regionOf(e.target)
    if (region) currentRegion.value = region
  })

  // pointerdown covers non-focusable interactions (canvas dragging, clicking
  // a layer row) that focusin alone won't catch.
  window.addEventListener('pointerdown', (e) => {
    const region = regionOf(e.target)
    if (region) currentRegion.value = region
  }, { capture: true })
}

export function useFocusRegion() {
  initFocusRegionTracking()
  return { currentRegion }
}
