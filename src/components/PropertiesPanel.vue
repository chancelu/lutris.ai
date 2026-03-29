<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useAIChat } from '@/composables/use-chat'

import ChatPanel from './ChatPanel.vue'
import ExportPanel from './ExportPanel.vue'
import SpecPanel from './SpecPanel.vue'

const store = useEditorStore()
const { activeTab, inlinePanel } = useAIChat()

const panelKey = computed(() => inlinePanel.value ?? 'chat')

function toggleInline(panel: 'spec' | 'export') {
  inlinePanel.value = inlinePanel.value === panel ? null : panel
}
</script>

<template>
  <aside
    data-test-id="properties-panel"
    class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-panel select-text"
  >
    <!-- Panel content with fade transition -->
    <Transition
      mode="out-in"
      enter-active-class="transition-opacity duration-100"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-75"
      leave-to-class="opacity-0"
    >
      <!-- Main: ChatPanel (full height when no inline panel) -->
      <div v-if="!inlinePanel" key="chat" class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatPanel class="flex-1" />
      </div>

      <!-- Inline: SpecPanel -->
      <div v-else-if="inlinePanel === 'spec'" key="spec" class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="flex items-center justify-between border-b border-border/10 px-3 py-2">
          <span class="text-[12px] font-semibold text-surface">Spec</span>
          <button class="text-[11px] text-muted hover:text-surface" @click="inlinePanel = null">Close</button>
        </div>
        <SpecPanel class="flex-1" />
      </div>

      <!-- Inline: ExportPanel -->
      <div v-else key="export" class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="flex items-center justify-between border-b border-border/10 px-3 py-2">
          <span class="text-[12px] font-semibold text-surface">Export</span>
          <button class="text-[11px] text-muted hover:text-surface" @click="inlinePanel = null">Close</button>
        </div>
        <ExportPanel class="flex-1" />
      </div>
    </Transition>

    <!-- Bottom bar: Spec + Export + Settings -->
    <div class="flex shrink-0 items-center justify-end gap-1 border-t border-border/10 px-3 py-1.5">
      <button
        class="flex size-7 items-center justify-center rounded-lg transition"
        :class="inlinePanel === 'spec' ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
        title="Spec"
        @click="toggleInline('spec')"
      >
        <icon-lucide-file-text class="size-3.5" />
      </button>
      <button
        class="flex size-7 items-center justify-center rounded-lg transition"
        :class="inlinePanel === 'export' ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
        title="Export"
        @click="toggleInline('export')"
      >
        <icon-lucide-download class="size-3.5" />
      </button>
    </div>
  </aside>
</template>
