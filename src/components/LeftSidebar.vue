<script setup lang="ts">
import { computed, ref } from 'vue'

import { useEditorStore } from '@/stores/editor'
import { useAIChat } from '@/composables/use-chat'
import { useAISelect } from '@/composables/use-ai-select'
import DesignPanel from './DesignPanel.vue'
import LayersPanel from './LayersPanel.vue'

const store = useEditorStore()
const { focusRequested } = useAIChat()
const { addCurrentSelection } = useAISelect()

const hasSelection = computed(() => (store.state.selectedIds?.size ?? 0) > 0)
const layersCollapsed = ref(false)

function editWithAI() {
  addCurrentSelection()
  focusRequested.value++
}
</script>

<template>
  <aside class="flex h-full w-[280px] shrink-0 flex-col overflow-hidden border-r border-border/10 bg-panel">
    <!-- Layers header -->
    <button
      class="flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-left hover:bg-hover"
      @click="layersCollapsed = !layersCollapsed"
    >
      <icon-lucide-chevron-right
        class="size-3 text-muted transition-transform"
        :class="!layersCollapsed && 'rotate-90'"
      />
      <span class="text-[11px] font-medium text-surface">Layers</span>
    </button>

    <!-- Layers content -->
    <div
      v-if="!layersCollapsed"
      class="flex min-h-[120px] flex-1 flex-col overflow-hidden border-b border-border/10"
    >
      <LayersPanel @collapse="layersCollapsed = true" />
    </div>
    <div v-else class="border-b border-border/10" />

    <!-- Design properties (when selection exists) -->
    <div v-if="hasSelection" class="flex max-h-[50%] shrink-0 flex-col overflow-y-auto">
      <button
        class="flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-left hover:bg-hover"
        @click="store.clearSelection()"
      >
        <icon-lucide-chevron-right class="size-3 rotate-90 text-muted" />
        <span class="text-[11px] font-medium text-surface">Design</span>
        <span class="ml-auto text-[10px] text-muted">✕</span>
      </button>
      <DesignPanel />
    </div>

    <!-- Edit with AI button -->
    <div v-if="hasSelection" class="shrink-0 border-t border-border/10 p-3">
      <button
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-[12px] font-medium text-white shadow-sm shadow-accent/20 transition hover:bg-accent/80"
        @click="editWithAI"
      >
        <icon-lucide-sparkles class="size-3.5" />
        Edit with AI
      </button>
    </div>
  </aside>
</template>
