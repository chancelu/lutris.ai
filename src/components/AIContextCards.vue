<script setup lang="ts">
import { useAISelect, type AISelectionContext } from '@/composables/use-ai-select'

const { selectedForAI, removeFromAIContext, clearAIContext } = useAISelect()

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    FRAME: '⬜',
    RECTANGLE: '▬',
    ELLIPSE: '⬭',
    TEXT: 'T',
    GROUP: '📁',
    COMPONENT: '◇',
    INSTANCE: '◆',
    SECTION: '§',
    LINE: '—',
    STAR: '★',
    POLYGON: '▲',
  }
  return icons[type] || '□'
}
</script>

<template>
  <div v-if="selectedForAI.length > 0" class="border-b border-border bg-inset px-3 py-2">
    <div class="mb-1.5 flex items-center justify-between">
      <span class="text-[11px] font-medium text-muted">
        🎯 Editing {{ selectedForAI.length }} element{{ selectedForAI.length > 1 ? 's' : '' }}
      </span>
      <button
        class="text-[10px] text-muted hover:text-surface transition"
        @click="clearAIContext"
      >
        Clear all
      </button>
    </div>
    <div class="flex flex-wrap gap-1">
      <div
        v-for="item in selectedForAI"
        :key="item.nodeId"
        class="group flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent"
      >
        <span class="opacity-60">{{ typeIcon(item.type) }}</span>
        <span class="max-w-24 truncate">{{ item.name }}</span>
        <span class="text-[9px] text-accent/50">{{ item.bounds.width }}×{{ item.bounds.height }}</span>
        <button
          class="ml-0.5 opacity-0 group-hover:opacity-100 transition text-accent/60 hover:text-accent"
          @click="removeFromAIContext(item.nodeId)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>
