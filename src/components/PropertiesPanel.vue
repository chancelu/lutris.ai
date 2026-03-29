<script setup lang="ts">
import { ref } from 'vue'

import { useAIChat } from '@/composables/use-chat'
import { useEditorStore } from '@/stores/editor'

import ChatPanel from './ChatPanel.vue'
import ExportPanel from './ExportPanel.vue'
import BrandSettings from './BrandSettings.vue'
import SpecPanel from './SpecPanel.vue'

const store = useEditorStore()
const { activeTab } = useAIChat()

const showBrandSettings = ref(false)
</script>

<template>
  <aside
    data-test-id="properties-panel"
    class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-panel select-text"
  >
    <!-- Tab switcher -->
    <div class="px-3 pt-3 pb-2">
      <div class="flex items-center gap-1 rounded-xl bg-inset p-1">
        <button
          class="flex-1 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
          :class="activeTab === 'create' ? 'bg-accent text-white' : 'text-muted hover:text-surface'"
          @click="activeTab = 'create'"
        >
          Create
        </button>
        <button
          class="flex-1 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
          :class="activeTab === 'spec' ? 'bg-accent text-white' : 'text-muted hover:text-surface'"
          @click="activeTab = 'spec'"
        >
          Spec
        </button>
        <button
          class="flex-1 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
          :class="activeTab === 'ship' ? 'bg-accent text-white' : 'text-muted hover:text-surface'"
          @click="activeTab = 'ship'"
        >
          Export
        </button>
      </div>
    </div>

    <!-- Create tab -->
    <div v-if="activeTab === 'create'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatPanel class="flex-1" />
      <div v-if="showBrandSettings" class="max-h-[42%] border-t border-border/10 bg-inset/20">
        <div class="flex items-center justify-between px-3 py-2">
          <div class="text-[12px] font-semibold text-surface">Brand</div>
          <button class="text-[11px] text-muted hover:text-surface" @click="showBrandSettings = false">
            Close
          </button>
        </div>
        <div class="h-[280px] overflow-y-auto">
          <BrandSettings />
        </div>
      </div>
      <div v-if="!showBrandSettings" class="flex shrink-0 justify-end px-3 pb-2">
        <button
          class="flex size-7 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-surface"
          title="Brand & provider settings"
          @click="showBrandSettings = true"
        >
          <icon-lucide-settings class="size-3.5" />
        </button>
      </div>
    </div>

    <!-- Spec tab -->
    <div v-else-if="activeTab === 'spec'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SpecPanel />
    </div>

    <!-- Export tab -->
    <div v-else class="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <ExportPanel />
    </div>
  </aside>
</template>
