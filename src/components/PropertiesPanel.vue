<script setup lang="ts">
import { computed, watch } from 'vue'
import { useAIChat } from '@/composables/use-chat'
import { usePipeline } from '@/composables/use-pipeline'

import ChatPanel from './ChatPanel.vue'
import CodePanel from './CodePanel.vue'
import ExportPanel from './ExportPanel.vue'
import SpecPanel from './SpecPanel.vue'

const { inlinePanel } = useAIChat()
const { currentPhase } = usePipeline()

// Contextual views: Chat is always available; Spec unlocks at the spec phase;
// Code unlocks at the dev phase. Export stays on TopBar / Ctrl+J.
const canViewSpec = computed(() => currentPhase.value !== 'idea')
const canViewCode = computed(() => currentPhase.value === 'dev')

// Phase-change behaviour: entering spec auto-opens the Spec view once;
// entering dev auto-opens the Code view once. This fires only on the phase
// edge, so a user who manually switched back within the phase is left alone.
watch(currentPhase, (phase, prev) => {
  if (phase === prev) return
  if (phase === 'spec') inlinePanel.value = 'spec'
  else if (phase === 'dev') inlinePanel.value = 'code'
})

// If the user somehow lands on a view their phase doesn't allow (e.g. jumped
// back via the stepper), fall back to chat.
watch([canViewSpec, canViewCode], () => {
  if (inlinePanel.value === 'spec' && !canViewSpec.value) inlinePanel.value = null
  if (inlinePanel.value === 'code' && !canViewCode.value) inlinePanel.value = null
})

type View = 'spec' | 'code' | null
function setView(view: View) {
  inlinePanel.value = inlinePanel.value === view ? null : view
}
</script>

<template>
  <aside
    data-test-id="properties-panel"
    class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-panel select-text"
  >
    <!-- Header: contextual view switch -->
    <div class="flex shrink-0 items-center gap-0.5 border-b border-border/30 px-2 py-1.5">
      <button
        data-test-id="panel-view-chat"
        class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition"
        :class="!inlinePanel ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
        title="Chat"
        @click="inlinePanel = null"
      >
        <icon-lucide-message-square class="size-3.5" />
        <span>Chat</span>
      </button>
      <button
        v-if="canViewSpec"
        data-test-id="panel-view-spec"
        class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition"
        :class="inlinePanel === 'spec' ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
        title="Spec"
        @click="setView('spec')"
      >
        <icon-lucide-file-text class="size-3.5" />
        <span>Spec</span>
      </button>
      <button
        v-if="canViewCode"
        data-test-id="panel-view-code"
        class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition"
        :class="inlinePanel === 'code' ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
        title="Code"
        @click="setView('code')"
      >
        <icon-lucide-code class="size-3.5" />
        <span>Code</span>
      </button>

      <div class="flex-1" />

      <!-- Export view indicator + close (Export is opened from TopBar / Ctrl+J) -->
      <template v-if="inlinePanel === 'export'">
        <span class="text-[11px] font-medium text-surface">Export</span>
        <button
          data-test-id="panel-export-close"
          class="ml-1 flex size-5 items-center justify-center rounded text-muted transition hover:bg-hover hover:text-surface"
          title="Back to chat"
          @click="inlinePanel = null"
        >
          <icon-lucide-x class="size-3" />
        </button>
      </template>
    </div>

    <!-- Chat — always alive, default view -->
    <div v-show="!inlinePanel" class="flex min-h-0 flex-1 flex-col overflow-hidden [user-select:text] [-webkit-user-select:text]">
      <ChatPanel class="flex-1" />
    </div>

    <!-- Spec view -->
    <div v-show="inlinePanel === 'spec'" class="flex min-h-0 flex-1 flex-col overflow-hidden [user-select:text] [-webkit-user-select:text]">
      <SpecPanel class="min-h-0 flex-1 overflow-auto" />
    </div>

    <!-- Code view (dev phase) -->
    <div v-show="inlinePanel === 'code'" class="flex min-h-0 flex-1 flex-col overflow-hidden [user-select:text] [-webkit-user-select:text]">
      <CodePanel class="flex-1" />
    </div>

    <!-- Export view -->
    <div v-show="inlinePanel === 'export'" class="flex min-h-0 flex-1 flex-col overflow-hidden overflow-y-auto [user-select:text] [-webkit-user-select:text]">
      <ExportPanel class="flex-1" />
    </div>
  </aside>
</template>
