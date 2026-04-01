<script setup lang="ts">
import { computed } from 'vue'

import { useEditorStore } from '@/stores/editor'
import { useAIChat } from '@/composables/use-chat'
import DesignPanel from './DesignPanel.vue'

const store = useEditorStore()
const { activeTab, draftMessage, focusRequested } = useAIChat()

const hasSelection = computed(() => (store.state.selectedIds?.size ?? 0) > 0)

const selectedNodeLabel = computed(() => {
  const ids = store.state.selectedIds
  if (!ids?.size) return ''
  if (ids.size > 1) return `${ids.size} elements`
  const node = store.graph.nodes.get(ids.values().next().value!)
  return node?.name || node?.type || 'Element'
})

function modifyWithAI() {
  const label = selectedNodeLabel.value
  if (label) {
    draftMessage.value = `[Editing: ${label}] `
  }
  activeTab.value = 'create'
  focusRequested.value++
}
</script>

<template>
  <Transition
    enter-active-class="transition-transform duration-150 ease-out"
    enter-from-class="translate-x-full"
    leave-active-class="transition-transform duration-100 ease-in"
    leave-to-class="translate-x-full"
  >
    <aside
      v-if="hasSelection"
      class="pointer-events-auto flex h-full w-[280px] shrink-0 flex-col overflow-hidden border-l border-border/10 bg-panel"
    >
      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <DesignPanel />
      </div>
      <div class="shrink-0 border-t border-border/10 p-3">
        <button
          class="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-[12px] font-medium text-white shadow-sm shadow-accent/20 transition hover:bg-accent/80"
          @click="modifyWithAI"
        >
          <icon-lucide-sparkles class="size-3.5" />
          Edit with AI
        </button>
      </div>
    </aside>
  </Transition>
</template>
