<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { useEditorStore } from '@/stores/editor'

const store = useEditorStore()

// Reactive trigger — poll undo state since UndoManager isn't Vue-reactive
// Use longer interval + manual trigger on undo/redo actions
const tick = ref(0)
const timer = setInterval(() => { tick.value++ }, 2000)
onUnmounted(() => clearInterval(timer))

function forceRefresh() { tick.value++ }

const undoEntries = computed(() => {
  void tick.value
  return store.undo.undoEntries
})

const redoEntries = computed(() => {
  void tick.value
  return store.undo.redoEntries
})

const canUndo = computed(() => {
  void tick.value
  return store.undo.canUndo
})

const canRedo = computed(() => {
  void tick.value
  return store.undo.canRedo
})

// Visual diff: track hovered entry index
const hoveredIndex = ref<number | null>(null)

function handleUndo() {
  store.undoAction()
  forceRefresh()
}

function handleRedo() {
  store.redoAction()
  forceRefresh()
}

function undoTo(index: number) {
  const count = undoEntries.value.length - index - 1
  if (count <= 0) return
  const undo = store.undo
  for (let i = 0; i < count; i++) {
    undo.undo()
  }
  forceRefresh()
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- Header -->
    <div class="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      <span class="text-[13px] font-semibold text-surface">History</span>
      <div class="flex-1" />
      <button
        :disabled="!canUndo"
        class="rounded px-2 py-1 text-[14px] text-muted hover:bg-hover hover:text-surface disabled:opacity-30"
        title="Undo (Ctrl+Z)"
        @click="handleUndo"
      >
        ↩
      </button>
      <button
        :disabled="!canRedo"
        class="rounded px-2 py-1 text-[14px] text-muted hover:bg-hover hover:text-surface disabled:opacity-30"
        title="Redo (Ctrl+Y)"
        @click="handleRedo"
      >
        ↪
      </button>
    </div>

    <ScrollAreaRoot class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="p-1.5">
          <!-- Redo entries (future) -->
          <div
            v-for="(entry, i) in [...redoEntries].reverse()"
            :key="'redo-' + i"
            class="mb-0.5 rounded px-2 py-1 text-[12px] text-muted/40"
          >
            <span class="mr-1.5 text-[11px]">↪</span>{{ entry.label }}
          </div>

          <!-- Current state marker -->
          <div
            v-if="undoEntries.length > 0 || redoEntries.length > 0"
            class="my-1 flex items-center gap-1.5 px-2"
          >
            <div class="h-px flex-1 bg-blue-500/50" />
            <span class="text-[11px] text-blue-400">Current</span>
            <div class="h-px flex-1 bg-blue-500/50" />
          </div>

          <!-- Undo entries (past) -->
          <div
            v-for="(entry, i) in [...undoEntries].reverse()"
            :key="'undo-' + i"
            class="mb-0.5 cursor-pointer rounded px-2 py-1 text-[12px] text-surface transition-colors"
            :class="[
              hoveredIndex !== null && i <= hoveredIndex
                ? 'bg-blue-500/15 text-blue-300'
                : 'hover:bg-hover'
            ]"
            @click="undoTo(undoEntries.length - 1 - i)"
            @mouseenter="hoveredIndex = i"
            @mouseleave="hoveredIndex = null"
          >
            <span class="mr-1.5 text-[11px] text-muted">↩</span>
            <span>{{ entry.label }}</span>
            <span
              v-if="hoveredIndex === i"
              class="ml-auto text-[10px] text-blue-400/70"
            >Revert here</span>
          </div>

          <!-- Empty state -->
          <div v-if="undoEntries.length === 0 && redoEntries.length === 0" class="px-4 py-8 text-center">
            <icon-lucide-history class="mx-auto size-8 text-muted/30" />
            <p class="mt-2 text-[12px] text-muted">No actions yet</p>
            <p class="mt-1 text-[11px] text-muted/70">Start editing to see history</p>
          </div>

          <!-- Initial state -->
          <div
            v-if="undoEntries.length > 0"
            class="mt-1 rounded bg-inset px-2 py-1 text-[11px] text-muted/60"
          >
            📄 Initial state
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>
  </div>
</template>
