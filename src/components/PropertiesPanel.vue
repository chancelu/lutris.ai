<script setup lang="ts">
import { ref, watch } from 'vue'

import { useAIChat } from '@/composables/use-chat'
import { useEditorStore } from '@/stores/editor'

import ChatPanel from './ChatPanel.vue'
import CodePanel from './CodePanel.vue'
import ExportPanel from './ExportPanel.vue'
import BrandSettings from './BrandSettings.vue'
import HandoffPanel from './HandoffPanel.vue'
import ProductDocPanel from './ProductDocPanel.vue'
import RequirementsBoard from './RequirementsBoard.vue'
import SpecPanel from './SpecPanel.vue'

const store = useEditorStore()
const { activeTab } = useAIChat()

const specTab = ref<'summary' | 'requirements' | 'versions'>('summary')
const showBrandSettings = ref(false)
const showShipMore = ref(false)

watch(showShipMore, (show) => {
  store.state.measurementMode = false
  if (!show) store.state.measurementMode = false
})
</script>

<template>
  <aside
    data-test-id="properties-panel"
    class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-panel select-text"
  >
    <!-- Tab switcher only — no title/description -->
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
          Ship
        </button>
      </div>
    </div>

    <!-- Create tab: clean prompt + optional brand via ⚙️ -->
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
      <!-- Settings icon for Brand + Provider -->
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

    <!-- Spec tab: collapsed by default, expand on click -->
    <div v-else-if="activeTab === 'spec'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="flex shrink-0 items-center gap-1 px-2 py-1.5">
        <button
          class="rounded-lg px-2 py-1 text-[11px]"
          :class="specTab === 'summary' ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
          @click="specTab = 'summary'"
        >
          Summary
        </button>
        <button
          class="rounded-lg px-2 py-1 text-[11px]"
          :class="specTab === 'requirements' ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
          @click="specTab = 'requirements'"
        >
          Requirements
        </button>
        <button
          class="rounded-lg px-2 py-1 text-[11px]"
          :class="specTab === 'versions' ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
          @click="specTab = 'versions'"
        >
          Versions
        </button>
      </div>
      <SpecPanel v-if="specTab === 'summary'" />
      <RequirementsBoard v-else-if="specTab === 'requirements'" class="flex-1 overflow-hidden" />
      <ProductDocPanel v-else default-section="versions" class="flex-1 overflow-y-auto" />
    </div>

    <!-- Ship tab: Export as main, Code/Handoff in "More options" -->
    <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ExportPanel />
      </div>
      <!-- More options: Code + Handoff collapsed -->
      <div class="shrink-0 border-t border-border/10">
        <button
          class="flex w-full items-center justify-between px-3 py-2 text-[11px] text-muted transition hover:text-surface"
          @click="showShipMore = !showShipMore"
        >
          <span>More options</span>
          <icon-lucide-chevron-down
            class="size-3 transition-transform"
            :class="showShipMore ? 'rotate-180' : ''"
          />
        </button>
        <div v-if="showShipMore" class="max-h-[50%] overflow-y-auto">
          <div class="border-t border-border/10 px-3 py-2">
            <div class="mb-1 text-[11px] font-medium text-surface">Code</div>
            <CodePanel />
          </div>
          <div class="border-t border-border/10 px-3 py-2">
            <div class="mb-1 text-[11px] font-medium text-surface">Handoff</div>
            <HandoffPanel />
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
