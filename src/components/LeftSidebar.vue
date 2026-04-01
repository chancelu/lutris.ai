<script setup lang="ts">
import { computed } from 'vue'

import { useEditorStore } from '@/stores/editor'
import { useAIChat } from '@/composables/use-chat'
import { useAISelect } from '@/composables/use-ai-select'
import DesignPanel from './DesignPanel.vue'
import LayersPanel from './LayersPanel.vue'

const store = useEditorStore()
const { activeTab, focusRequested } = useAIChat()
const { addCurrentSelection } = useAISelect()

const hasSelection = computed(() => (store.state.selectedIds?.size ?? 0) > 0)

function editWithAI() {
  addCurrentSelection()
  activeTab.value = 'create'
  focusRequested.value++
}
</script>

<template>
  <aside class="flex h-full w-[280px] shrink-0 flex-col overflow-hidden border-r border-border/10 bg-panel">
    <!-- Layers: top half -->
    <div class="flex min-h-[200px] flex-1 flex-col overflow-hidden border-b border-border/10">
      <LayersPanel @collapse="() => {}" />
    </div>

    <!-- Design properties: bottom half (when selection exists) -->
    <div v-if="hasSelection" class="flex max-h-[50%] shrink-0 flex-col overflow-y-auto">
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
