<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  resize: [width: number, height: number]
}>()

interface Viewport {
  name: string
  icon: string
  width: number
  height: number
}

const VIEWPORTS: Viewport[] = [
  { name: 'Desktop', icon: '🖥️', width: 1440, height: 900 },
  { name: 'Laptop', icon: '💻', width: 1280, height: 800 },
  { name: 'Tablet', icon: '📱', width: 768, height: 1024 },
  { name: 'Mobile', icon: '📲', width: 375, height: 812 },
  { name: 'Mobile SM', icon: '📱', width: 320, height: 568 },
]

const activeViewport = ref<string>('Desktop')
const isActive = ref(false)

function selectViewport(vp: Viewport) {
  activeViewport.value = vp.name
  isActive.value = true
  emit('resize', vp.width, vp.height)
}

function resetViewport() {
  isActive.value = false
  activeViewport.value = 'Desktop'
  emit('resize', 0, 0) // 0,0 = reset to full canvas
}

const currentViewport = computed(() =>
  VIEWPORTS.find((v) => v.name === activeViewport.value)
)
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      v-for="vp in VIEWPORTS"
      :key="vp.name"
      :title="`${vp.name} (${vp.width}×${vp.height})`"
      class="rounded px-1.5 py-0.5 text-[12px] transition-colors"
      :class="isActive && activeViewport === vp.name
        ? 'bg-blue-600 text-white'
        : 'text-muted hover:bg-hover hover:text-surface'"
      @click="selectViewport(vp)"
    >
      {{ vp.icon }}
    </button>
    <button
      v-if="isActive"
      class="ml-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
      title="Reset to full canvas"
      @click="resetViewport"
    >
      ✕
    </button>
    <span v-if="isActive && currentViewport" class="ml-1 text-[11px] text-muted">
      {{ currentViewport.width }}×{{ currentViewport.height }}
    </span>
  </div>
</template>
