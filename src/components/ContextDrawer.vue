<script setup lang="ts">
import { computed } from 'vue'

import { useEditorStore } from '@/stores/editor'
import { useAIChat } from '@/composables/use-chat'
import DesignPanel from './DesignPanel.vue'

const store = useEditorStore()
const { activeTab } = useAIChat()

const hasSelection = computed(() => (store.state.selectedIds?.length ?? 0) > 0)

function modifyWithAI() {
  activeTab.value = 'create'
}
</script>

<template>
  <aside
    v-if="hasSelection"
    class="flex h-full w-[280px] shrink-0 flex-col overflow-hidden border-l border-border/10 bg-panel"
  >
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <DesignPanel />
    </div>
    <div class="shrink-0 border-t border-border/10 p-3">
      <button
        class="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-[12px] font-medium text-white transition hover:bg-accent/80"
        @click="modifyWithAI"
      >
        Modify with AI
      </button>
    </div>
  </aside>
</template>
