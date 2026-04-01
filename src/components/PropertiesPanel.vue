<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useAIChat } from '@/composables/use-chat'

import ChatPanel from './ChatPanel.vue'
import ExportPanel from './ExportPanel.vue'
import SpecPanel from './SpecPanel.vue'

const store = useEditorStore()
const { inlinePanel } = useAIChat()

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
    <!-- Chat panel — always alive, hidden when inline panel is open -->
    <div v-show="!inlinePanel" class="flex min-h-0 flex-1 flex-col overflow-hidden [user-select:text] [-webkit-user-select:text]">
      <div class="flex items-center gap-1.5 border-b border-border/10 px-3 py-2">
        <icon-lucide-sparkles class="size-3 text-accent/60" />
        <span class="text-[11px] font-medium text-muted">AI Assistant</span>
      </div>
      <ChatPanel class="flex-1" />
    </div>

    <!-- Spec panel — always alive, hidden when not active -->
    <div v-show="inlinePanel === 'spec'" class="flex min-h-0 flex-1 flex-col overflow-hidden [user-select:text] [-webkit-user-select:text]">
      <div class="flex items-center justify-between border-b border-border/10 px-3 py-2">
        <span class="text-[12px] font-semibold text-surface">Spec</span>
        <button class="text-[11px] text-muted hover:text-surface" @click="inlinePanel = null">Close</button>
      </div>
      <SpecPanel class="min-h-0 flex-1 overflow-auto" />
    </div>

    <!-- Export panel — always alive, hidden when not active -->
    <div v-show="inlinePanel === 'export'" class="flex min-h-0 flex-1 flex-col overflow-hidden [user-select:text] [-webkit-user-select:text]">
      <div class="flex items-center justify-between border-b border-border/10 px-3 py-2">
        <span class="text-[12px] font-semibold text-surface">Export</span>
        <button class="text-[11px] text-muted hover:text-surface" @click="inlinePanel = null">Close</button>
      </div>
      <ExportPanel class="flex-1" />
    </div>

    <!-- Bottom bar: Spec + Export -->
    <div class="flex shrink-0 items-center justify-end gap-1 border-t border-border/10 px-3 py-1.5">
      <button
        class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] transition"
        :class="inlinePanel === 'spec' ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
        title="Spec"
        @click="toggleInline('spec')"
      >
        <icon-lucide-file-text class="size-3.5" />
        <span>Spec</span>
      </button>
      <button
        class="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] transition"
        :class="inlinePanel === 'export' ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
        title="Export"
        @click="toggleInline('export')"
      >
        <icon-lucide-download class="size-3.5" />
        <span>Export</span>
      </button>
    </div>
  </aside>
</template>
