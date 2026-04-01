import { useEventListener, useMagicKeys, whenever } from '@vueuse/core'
import { computed } from 'vue'

import { extractImageFilesFromClipboard } from '@/composables/use-canvas-drop'
import { useAIChat } from '@/composables/use-chat'
import { TOOL_SHORTCUTS, useEditorStore } from '@/stores/editor'
import { closeTab, createTab, activeTab as activeTabRef } from '@/stores/tabs'

import { openFileDialog } from './use-menu'

import type { ComputedRef } from 'vue'

function isEditing(e: Event) {
  const t = e.target
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t instanceof HTMLElement && t.isContentEditable)
}

const PREVENT_MOD_ALT = new Set(['KeyK', 'KeyB'])
const PREVENT_MOD_SHIFT = new Set(['KeyK', 'KeyH', 'KeyL', 'KeyE', 'KeyS', 'KeyG', 'KeyZ'])
const PREVENT_MOD_ONLY = new Set([
  'Backslash',
  'KeyJ',
  'KeyW',
  'KeyN',
  'KeyT',
  'KeyZ',
  'KeyY',
  'Digit0',
  'Digit1',
  'Digit2',
  'KeyD',
  'KeyA',
  'KeyS',
  'KeyO',
  'KeyG',
  'Equal',
  'Minus',
  'NumpadAdd',
  'NumpadSubtract'
])
const PREVENT_SHIFT_ONLY = new Set(['Digit1', 'Digit2', 'KeyA'])
const PREVENT_PLAIN_KEY = new Set(['[', ']'])
const PREVENT_DELETE_KEY = new Set(['Backspace', 'Delete'])

function shouldPreventDefault(e: KeyboardEvent, hasPenState: boolean): boolean {
  const mod = e.metaKey || e.ctrlKey

  if (mod) {
    if (e.altKey && PREVENT_MOD_ALT.has(e.code)) return true
    if (e.shiftKey && PREVENT_MOD_SHIFT.has(e.code)) return true
    if (!e.shiftKey && !e.altKey && PREVENT_MOD_ONLY.has(e.code)) return true
  } else {
    if (e.shiftKey && PREVENT_SHIFT_ONLY.has(e.code)) return true
    if (!e.shiftKey && PREVENT_PLAIN_KEY.has(e.key)) return true
  }

  return PREVENT_DELETE_KEY.has(e.key) || (e.key === 'Enter' && hasPenState)
}

export function useKeyboard() {
  const { activeTab, inlinePanel } = useAIChat()
  const store = useEditorStore()

  useEventListener(window, 'copy', (e: ClipboardEvent) => {
    if (isEditing(e)) return
    e.preventDefault()
    if (e.clipboardData) store.writeCopyData(e.clipboardData)
  })

  useEventListener(window, 'cut', (e: ClipboardEvent) => {
    if (isEditing(e)) return
    e.preventDefault()
    if (e.clipboardData) store.writeCopyData(e.clipboardData)
    store.deleteSelected()
  })

  useEventListener(window, 'paste', (e: ClipboardEvent) => {
    if (isEditing(e)) return
    e.preventDefault()

    const { cursorCanvasX: ccx, cursorCanvasY: ccy } = store.state
    const cursorPos = ccx != null && ccy != null ? { x: ccx, y: ccy } : undefined

    const imageFiles = extractImageFilesFromClipboard(e)
    if (imageFiles.length) {
      const cx = cursorPos?.x ?? (-store.state.panX + window.innerWidth / 2) / store.state.zoom
      const cy = cursorPos?.y ?? (-store.state.panY + window.innerHeight / 2) / store.state.zoom
      void store.placeImageFiles(imageFiles, cx, cy)
      return
    }

    const html = e.clipboardData?.getData('text/html') ?? ''
    if (html) store.pasteFromHTML(html, cursorPos)
  })

  const keys = useMagicKeys({
    passive: false,
    onEventFired(e) {
      if (e.type !== 'keydown') return
      if (isEditing(e)) return

      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const tool = TOOL_SHORTCUTS[e.key.toLowerCase()]
        if (tool) {
          store.setTool(tool)
          return
        }
      }

      // Ctrl+/- canvas zoom (handle here for key repeat support)
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
        if (e.code === 'Equal' || e.code === 'NumpadAdd') {
          e.preventDefault()
          store.applyZoom(-120, window.innerWidth / 2, window.innerHeight / 2)
          return
        }
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
          e.preventDefault()
          store.applyZoom(120, window.innerWidth / 2, window.innerHeight / 2)
          return
        }
      }

      if (shouldPreventDefault(e, !!store.state.penState)) e.preventDefault()
    }
  })

  // Cross-platform mod: true when Meta (Mac) or Control (Win/Linux) is pressed with the combo.
  // Checks that no extra modifiers are held beyond what the combo specifies.
  function mod(combo: string): ComputedRef<boolean> {
    const hasShift = combo.includes('shift')
    const hasAlt = combo.includes('alt')
    const base = computed(() => keys[`meta+${combo}`].value || keys[`control+${combo}`].value)
    if (hasShift && hasAlt) return base
    if (hasShift) return computed(() => base.value && !keys['alt'].value)
    if (hasAlt) return computed(() => base.value && !keys['shift'].value)
    return computed(() => base.value && !keys['shift'].value && !keys['alt'].value)
  }

  // --- Mod + Alt ---
  whenever(mod('alt+keyk'), () => store.createComponentFromSelection())
  whenever(mod('alt+keyb'), () => store.detachInstance())

  // --- Mod + Shift ---
  whenever(mod('shift+keyk'), () => store.createComponentSetFromComponents())
  whenever(mod('shift+keyh'), () => store.toggleVisibility())
  whenever(mod('shift+keyl'), () => store.toggleLock())
  whenever(mod('shift+keye'), () => {
    if (store.state.selectedIds.size > 0) void store.exportSelection(1, 'PNG')
  })
  whenever(mod('shift+keys'), () => store.saveFigFileAs())
  whenever(mod('shift+keyg'), () => store.ungroupSelected())
  whenever(mod('shift+keyz'), () => store.redoAction())

  // --- Mod + Key ---
  whenever(mod('backslash'), () => {
    store.state.showUI = !store.state.showUI
  })
  whenever(mod('keyj'), () => {
    activeTab.value = activeTab.value === 'create' ? 'ship' : 'create'
  })
  whenever(mod('keyw'), () => {
    if (activeTabRef.value) closeTab(activeTabRef.value.id)
  })
  whenever(mod('keyn'), () => createTab())
  whenever(mod('keyt'), () => createTab())
  whenever(mod('keyz'), () => store.undoAction())
  whenever(mod('keyy'), () => store.redoAction())
  whenever(mod('digit0'), () => store.zoomTo100())
  whenever(mod('digit1'), () => store.zoomToFit())
  whenever(mod('digit2'), () => store.zoomToSelection())
  whenever(mod('keyd'), () => store.duplicateSelected())
  whenever(mod('keya'), () => store.selectAll())
  whenever(mod('keys'), () => store.saveFigFile())
  whenever(mod('keyo'), () => openFileDialog())
  whenever(mod('keyg'), () => store.groupSelected())

  // --- Shift (no mod) ---
  whenever(
    computed(() => keys['shift+digit1'].value && !keys['meta'].value && !keys['control'].value),
    () => store.zoomToFit()
  )
  whenever(
    computed(() => keys['shift+digit2'].value && !keys['meta'].value && !keys['control'].value),
    () => store.zoomToSelection()
  )
  whenever(
    computed(() => keys['shift+keya'].value && !keys['meta'].value && !keys['control'].value),
    () => {
      const node = store.selectedNode.value
      if (node?.type === 'FRAME' && store.selectedNodes.value.length === 1) {
        store.setLayoutMode(node.id, node.layoutMode === 'NONE' ? 'VERTICAL' : 'NONE')
      } else if (store.selectedNodes.value.length > 0) {
        store.wrapInAutoLayout()
      }
    }
  )

  // --- Plain keys (no modifiers) ---
  function plain(key: string): ComputedRef<boolean> {
    return computed(
      () =>
        keys[key].value &&
        !keys['meta'].value &&
        !keys['control'].value &&
        !keys['shift'].value &&
        !keys['alt'].value
    )
  }

  whenever(plain('bracketright'), () => store.bringToFront())
  whenever(plain('bracketleft'), () => store.sendToBack())
  whenever(plain('backspace'), () => store.deleteSelected())
  whenever(plain('delete'), () => store.deleteSelected())
  whenever(plain('enter'), () => {
    if (store.state.penState) store.penCommit(false)
  })
  whenever(plain('escape'), () => {
    if (store.state.penState) {
      store.penCancel()
      return
    }
    store.clearSelection()
    store.setTool('SELECT')
  })

  // --- Workflow shortcuts ---
  // Ctrl+E → Ship
  whenever(mod('keye'), () => {
    activeTab.value = 'ship'
  })
  // Ctrl+/ → Create
  whenever(mod('slash'), () => {
    activeTab.value = 'create'
  })
  // Ctrl+B → Create (Brand lives inside Create)
  whenever(mod('keyb'), () => {
    activeTab.value = 'create'
  })
  // Ctrl+Shift+F → Ship
  whenever(mod('shift+keyf'), () => {
    activeTab.value = 'ship'
  })
  // Ctrl+Shift+D → Spec
  whenever(mod('shift+keyd'), () => {
    inlinePanel.value = inlinePanel.value === 'spec' ? null : 'spec'
  })

}
