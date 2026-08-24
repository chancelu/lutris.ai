<script setup lang="ts">
// R14: 右下角悬浮缩放控件（Framer/Figma 式）。点击百分比复位 100%。
import { computed } from 'vue'

import { useEditorStore } from '@/stores/editor'

const store = useEditorStore()

const zoomPercent = computed(() => Math.round(store.state.zoom * 100))

function zoomStep(direction: 1 | -1) {
  // applyZoom 是 delta 制（exp(-delta / ZOOM_DIVISOR)），±250 约等于一步 1.28x
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  store.applyZoom(direction === 1 ? -250 : 250, cx, cy)
}
</script>

<template>
  <div
    data-test-id="zoom-controls"
    class="glass flex items-center gap-0.5 rounded-full border border-border/40 px-1.5 py-1 shadow-xl shadow-black/25"
  >
    <button
      data-test-id="zoom-out"
      class="flex size-6 items-center justify-center rounded-full text-muted transition hover:bg-hover hover:text-surface"
      title="Zoom out"
      @click="zoomStep(-1)"
    >
      <icon-lucide-minus class="size-3.5" />
    </button>
    <button
      data-test-id="zoom-reset"
      class="min-w-10 rounded-full px-1 py-0.5 text-center text-[11px] font-medium text-surface transition hover:bg-hover"
      title="Reset to 100%"
      @click="store.zoomTo100()"
    >
      {{ zoomPercent }}%
    </button>
    <button
      data-test-id="zoom-in"
      class="flex size-6 items-center justify-center rounded-full text-muted transition hover:bg-hover hover:text-surface"
      title="Zoom in"
      @click="zoomStep(1)"
    >
      <icon-lucide-plus class="size-3.5" />
    </button>
    <div class="mx-0.5 h-3.5 w-px bg-border/60" />
    <button
      data-test-id="zoom-fit"
      class="flex size-6 items-center justify-center rounded-full text-muted transition hover:bg-hover hover:text-surface"
      title="Zoom to fit"
      @click="store.zoomToFit()"
    >
      <icon-lucide-maximize class="size-3.5" />
    </button>
  </div>
</template>
