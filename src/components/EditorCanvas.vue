<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

import { useCanvas } from '@/composables/use-canvas'
import { useCanvasDrop } from '@/composables/use-canvas-drop'
import { useCanvasInput } from '@/composables/use-canvas-input'
import { useCollabInjected } from '@/composables/use-collab'
import { useComments } from '@/composables/use-comments'
import { useComponentDrag } from '@/composables/use-component-drag'
import { useTextEdit } from '@/composables/use-text-edit'
import { useEditorStore } from '@/stores/editor'
import CanvasContextMenu from './CanvasContextMenu.vue'
import CollabCursors from './CollabCursors.vue'
import CommentPin from './CommentPin.vue'
import QuickActions from './QuickActions.vue'
import { useAISelect } from '@/composables/use-ai-select'
import { useAIChat } from '@/composables/use-chat'

const store = useEditorStore()
const collab = useCollabInjected()
const { comments, isAddingComment, addComment, cancelAddingComment } = useComments()
const { handleCanvasDrop } = useComponentDrag()
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Inline comment input
const showCommentInput = ref(false)
const commentInputPos = ref({ x: 0, y: 0, cx: 0, cy: 0 })
const commentText = ref('')
const commentInputRef = ref<HTMLInputElement | null>(null)

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
  (cx, cy) => collab?.updateCursor(cx, cy, store.state.currentPageId)
)

useTextEdit(canvasRef, store)
const { isDraggingOver } = useCanvasDrop(canvasRef, store)
const { aiSelectMode, addNodeToAIContext, addNodesInRect } = useAISelect()
const { activeTab } = useAIChat()

// AI Select confirmation popup
const showAISelectPopup = ref(false)
const aiSelectPopupPos = ref({ x: 0, y: 0 })
const aiSelectNodeName = ref('')
const aiSelectNodeIds = ref<string[]>([])

// AI Select marquee (lasso) drag
const aiMarquee = ref<{ startX: number; startY: number; endX: number; endY: number } | null>(null)
const isAIMarqueeDragging = ref(false)

function handleAIMarqueeDown(e: MouseEvent) {
  if (!aiSelectMode.value) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  aiMarquee.value = { startX: sx, startY: sy, endX: sx, endY: sy }
  isAIMarqueeDragging.value = true
}

function handleAIMarqueeMove(e: MouseEvent) {
  if (!isAIMarqueeDragging.value || !aiMarquee.value) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  aiMarquee.value.endX = e.clientX - rect.left
  aiMarquee.value.endY = e.clientY - rect.top
}

function handleAIMarqueeUp(e: MouseEvent) {
  if (!isAIMarqueeDragging.value || !aiMarquee.value) return
  isAIMarqueeDragging.value = false
  const m = aiMarquee.value

  // Calculate canvas-space rect
  const minSx = Math.min(m.startX, m.endX)
  const minSy = Math.min(m.startY, m.endY)
  const w = Math.abs(m.endX - m.startX)
  const h = Math.abs(m.endY - m.startY)

  // Only treat as marquee if dragged > 5px
  if (w > 5 && h > 5) {
    const cx = (minSx - store.state.panX) / store.state.zoom
    const cy = (minSy - store.state.panY) / store.state.zoom
    const cw = w / store.state.zoom
    const ch = h / store.state.zoom
    addNodesInRect({ x: cx, y: cy, width: cw, height: ch })

    // Show popup at center of marquee
    aiSelectPopupPos.value = { x: minSx + w / 2, y: minSy }
    const count = store.state.selectedIds?.length || 0
    aiSelectNodeName.value = `Area selection`
    aiSelectNodeIds.value = [] // already added via addNodesInRect
    showAISelectPopup.value = true
  }

  aiMarquee.value = null
}

const aiMarqueeStyle = computed(() => {
  if (!aiMarquee.value) return null
  const m = aiMarquee.value
  return {
    left: `${Math.min(m.startX, m.endX)}px`,
    top: `${Math.min(m.startY, m.endY)}px`,
    width: `${Math.abs(m.endX - m.startX)}px`,
    height: `${Math.abs(m.endY - m.startY)}px`,
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

watch(
  () => [...store.state.selectedIds],
  (ids) => collab?.updateSelection(ids)
)

const cursor = computed(() => {
  if (aiSelectMode.value) return 'crosshair'
  if (isAddingComment.value) return 'crosshair'
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
    if (ids?.length) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      aiSelectPopupPos.value = { x: sx, y: sy }
      aiSelectNodeIds.value = [...ids]
      // Get name of first selected node
      const node = store.graph.nodes.get(ids[0])
      aiSelectNodeName.value = ids.length === 1
        ? (node?.name || node?.type || 'Element')
        : `${ids.length} elements`
      showAISelectPopup.value = true
    }
    return
  }
  if (!isAddingComment.value) return
  // Convert screen coords to canvas coords
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  const cx = (sx - store.state.panX) / store.state.zoom
  const cy = (sy - store.state.panY) / store.state.zoom
  // Show inline input at click position
  commentInputPos.value = { x: sx, y: sy, cx, cy }
  commentText.value = ''
  showCommentInput.value = true
  cancelAddingComment()
  nextTick(() => commentInputRef.value?.focus())
}

function submitComment() {
  if (commentText.value.trim()) {
    addComment(commentInputPos.value.cx, commentInputPos.value.cy, commentText.value.trim())
  }
  showCommentInput.value = false
  commentText.value = ''
}

function cancelComment() {
  showCommentInput.value = false
  commentText.value = ''
}

function handleComponentDrop(e: DragEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const payload = handleCanvasDrop(e, rect, store.state.zoom, store.state.panX, store.state.panY)
  if (!payload) return

  try {
    const nodes = JSON.parse(payload.nodeData)
    if (!Array.isArray(nodes) || nodes.length === 0) return

    const pageId = store.state.currentPageId
    for (const nodeData of nodes) {
      const { type = 'RECTANGLE', ...overrides } = nodeData
      store.graph.createNode(type, pageId, overrides)
    }
    // Trigger re-render
    store.graph.emitter.emit('tree:changed')
  } catch {
    console.warn('Failed to deserialize dropped component')
  }
}
</script>

<template>
  <CanvasContextMenu>
    <div
      data-test-id="canvas-area"
      class="canvas-area relative min-h-0 min-w-0 flex-1 overflow-hidden"
      @click="handleCanvasClick"
      @mousedown="handleAIMarqueeDown"
      @mousemove="handleAIMarqueeMove"
      @mouseup="handleAIMarqueeUp"
      @dragover.prevent
      @drop.prevent="handleComponentDrop"
    >
      <canvas
        ref="canvasRef"
        data-test-id="canvas-element"
        :style="{ cursor }"
        class="block size-full touch-none"
      />
      <!-- Comment pins -->
      <CommentPin
        v-for="c in comments"
        :key="c.id"
        :comment="c"
      />
      <!-- Remote collaboration cursors -->
      <CollabCursors />
      <!-- AI Select marquee overlay -->
      <div
        v-if="aiMarquee && isAIMarqueeDragging"
        class="pointer-events-none absolute z-20 border-2 border-dashed border-accent/60 bg-accent/10"
        :style="aiMarqueeStyle"
      />
      <!-- Quick action toolbar -->
      <!-- QuickActions merged into Toolbar -->
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
      <!-- Inline comment input -->
      <div
        v-if="showCommentInput"
        class="absolute z-30 flex items-center gap-1 rounded-lg border border-border bg-panel p-1 shadow-lg"
        :style="{ left: `${commentInputPos.x}px`, top: `${commentInputPos.y + 8}px` }"
        @click.stop
      >
        <input
          ref="commentInputRef"
          v-model="commentText"
          type="text"
          placeholder="Add comment..."
          class="w-48 rounded border-none bg-transparent px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:outline-none"
          @keydown.enter="submitComment"
          @keydown.escape="cancelComment"
        />
        <button
          :disabled="!commentText.trim()"
          class="rounded bg-blue-600 px-2 py-1 text-[12px] text-white hover:bg-blue-500 disabled:opacity-40"
          @click="submitComment"
        >
          Post
        </button>
      </div>
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
