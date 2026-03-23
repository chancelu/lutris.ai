<script setup lang="ts">
import { computed } from 'vue'
import { colorToCSS } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'

// Enhanced remote cursor display with smooth animations and selection indicators

const store = useEditorStore()

interface CursorInfo {
  name: string
  color: string
  x: number
  y: number
  selection?: string[]
  lastActive: number
}

const cursors = computed(() => {
  return store.state.remoteCursors.map((c) => ({
    ...c,
    screenX: c.x * store.state.zoom + store.state.panX,
    screenY: c.y * store.state.zoom + store.state.panY,
    colorHex: colorToCSS(c.color),
    initials: c.name.slice(0, 2).toUpperCase(),
    isActive: true, // Could track last activity time
  }))
})
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-20 overflow-hidden">
    <div
      v-for="(cursor, i) in cursors"
      :key="i"
      class="absolute transition-all duration-150 ease-out"
      :style="{ left: `${cursor.screenX}px`, top: `${cursor.screenY}px` }"
    >
      <!-- Cursor arrow -->
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        class="drop-shadow-md"
      >
        <path
          d="M0 0L16 12L8 12L4 20L0 0Z"
          :fill="cursor.colorHex"
          stroke="white"
          stroke-width="1"
        />
      </svg>

      <!-- Name label -->
      <div
        class="absolute left-4 top-4 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-md"
        :style="{ backgroundColor: cursor.colorHex }"
      >
        {{ cursor.name }}
      </div>

      <!-- Selection count badge -->
      <div
        v-if="cursor.selection && cursor.selection.length > 0"
        class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-white text-[8px] font-bold shadow-sm"
        :style="{ color: cursor.colorHex }"
      >
        {{ cursor.selection.length }}
      </div>
    </div>
  </div>
</template>
