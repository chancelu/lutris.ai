<script setup lang="ts">
import { ref, computed, watch } from 'vue'

import { useCanvas } from '@/composables/use-canvas'
import { useCanvasDrop } from '@/composables/use-canvas-drop'
import { useCanvasInput } from '@/composables/use-canvas-input'
import { useTextEdit } from '@/composables/use-text-edit'
import { useEditorStore } from '@/stores/editor'
import CanvasContextMenu from './CanvasContextMenu.vue'
import { useAISelect } from '@/composables/use-ai-select'
import { useAIChat } from '@/composables/use-chat'

const store = useEditorStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

const { hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = useCanvas(
  canvasRef,
  store
)
const { cursorOverride } = useCanvasInput(
  canvasRef,
  store,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
  undefined
)

useTextEdit(canvasRef, store)
const { isDraggingOver } = useCanvasDrop(canvasRef, store)
const { aiSelectMode, addNodeToAIContext } = useAISelect()
const { activeTab, isGenerating } = useAIChat()

// AI Select confirmation popup
const showAISelectPopup = ref(false)
const aiSelectPopupPos = ref({ x: 0, y: 0 })
const aiSelectNodeName = ref('')
const aiSelectNodeIds = ref<string[]>([])

// Show popup when store marquee completes during AI select mode
watch(() => store.state.marquee, (newVal, oldVal) => {
  if (aiSelectMode.value && oldVal && !newVal) {
    // Marquee just ended — show popup at the center of where it was
    const m = oldVal
    const sx = m.x * store.state.zoom + store.state.panX
    const sy = m.y * store.state.zoom + store.state.panY
    const sw = m.width * store.state.zoom
    const sh = m.height * store.state.zoom
    aiSelectPopupPos.value = { x: sx + sw / 2, y: sy }
    aiSelectNodeName.value = 'Area selection'
    aiSelectNodeIds.value = []
    showAISelectPopup.value = true
  }
})

// Visual marquee overlay driven by store state during AI select mode
const aiMarqueeStyle = computed(() => {
  if (!aiSelectMode.value || !store.state.marquee) return null
  const m = store.state.marquee
  const sx = m.x * store.state.zoom + store.state.panX
  const sy = m.y * store.state.zoom + store.state.panY
  const sw = m.width * store.state.zoom
  const sh = m.height * store.state.zoom
  return {
    left: `${sx}px`,
    top: `${sy}px`,
    width: `${sw}px`,
    height: `${sh}px`,
  }
})

function confirmAISelect() {
  // For click-based selection, add nodes now; for marquee, already added
  if (aiSelectNodeIds.value.length) {
    for (const id of aiSelectNodeIds.value) addNodeToAIContext(id)
  }
  activeTab.value = 'create'
  showAISelectPopup.value = false
}

function dismissAISelect() {
  showAISelectPopup.value = false
}

const cursor = computed(() => {
  if (aiSelectMode.value) return 'crosshair'
  if (cursorOverride.value) return cursorOverride.value
  const tool = store.state.activeTool
  if (tool === 'HAND') return 'grab'
  if (tool === 'SELECT') return 'default'
  if (tool === 'TEXT') return 'text'
  return 'crosshair'
})

function handleCanvasClick(e: MouseEvent) {
  // AI Select mode: show confirmation popup
  if (aiSelectMode.value) {
    const ids = store.state.selectedIds
    if (ids?.size) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      aiSelectPopupPos.value = { x: sx, y: sy }
      aiSelectNodeIds.value = [...ids]
      // Get name of first selected node
      const node = store.graph.nodes.get([...ids][0])
      aiSelectNodeName.value = ids.size === 1
        ? (node?.name || node?.type || 'Element')
        : `${ids.size} elements`
      showAISelectPopup.value = true
    }
    return
  }
}
</script>

<template>
  <CanvasContextMenu>
    <div
      data-test-id="canvas-area"
      class="canvas-area relative min-h-0 min-w-0 flex-1 overflow-hidden"
      @click="handleCanvasClick"
    >
      <!-- AI generating indicator bar -->
      <div
        v-if="isGenerating"
        class="absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden"
      >
        <div class="h-full w-1/3 animate-[ai-slide_1.2s_ease-in-out_infinite] rounded-full bg-accent/70" />
      </div>
      <canvas
        ref="canvasRef"
        data-test-id="canvas-element"
        :style="{ cursor }"
        class="block size-full touch-none"
      />
      <!-- AI Select marquee overlay -->
      <div
        v-if="aiMarqueeStyle"
        class="pointer-events-none absolute z-20 border-2 border-dashed border-accent/60 bg-accent/10"
        :style="aiMarqueeStyle"
      />
      <!-- Quick action toolbar -->
      <!-- AI Select confirmation popup -->
      <Transition
        enter-active-class="transition-all duration-150"
        enter-from-class="opacity-0 scale-95"
        leave-active-class="transition-all duration-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showAISelectPopup"
          class="absolute z-30 flex items-center gap-2 rounded-lg border border-accent/30 bg-panel px-3 py-2 shadow-xl"
          :style="{ left: `${aiSelectPopupPos.x}px`, top: `${Math.max(8, aiSelectPopupPos.y - 48)}px` }"
          @click.stop
        >
          <span class="text-[12px] text-surface">🎯 {{ aiSelectNodeName }}</span>
          <button
            class="rounded bg-accent px-2.5 py-1 text-[11px] text-white transition hover:bg-accent/80"
            @click="confirmAISelect"
          >
            Send to AI Chat
          </button>
          <button
            class="text-[11px] text-muted hover:text-surface transition"
            @click="dismissAISelect"
          >
            ✕
          </button>
        </div>
      </Transition>
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isDraggingOver"
          class="pointer-events-none absolute inset-0 z-40 border-2 border-dashed border-accent/60 bg-accent/5"
        />
      </Transition>
      <Transition leave-active-class="transition-opacity duration-300" leave-to-class="opacity-0">
        <div
          v-if="store.state.loading"
          data-test-id="canvas-loading"
          class="absolute inset-0 z-50 flex items-center justify-center bg-canvas"
        >
          <svg
            class="size-8 text-white opacity-40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="m15.232 5.232 3.536 3.536m-2.036-5.036a2.5 2.5 0 0 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732Z"
            />
          </svg>
          <div
            class="absolute bottom-1/2 left-1/2 h-0.5 w-25 -translate-x-1/2 translate-y-10 overflow-hidden rounded-full bg-white/8"
          >
            <div
              class="h-full w-2/5 animate-[slide_1s_ease-in-out_infinite] rounded-full bg-white/25"
            />
          </div>
        </div>
      </Transition>
    </div>
  </CanvasContextMenu>
</template>
