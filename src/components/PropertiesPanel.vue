<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

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
const shipTab = ref<'export' | 'code' | 'handoff'>('export')
const showBrandSettings = ref(false)

watch(shipTab, (tab) => {
  store.state.measurementMode = tab === 'handoff'
})

const panelTitle = computed(() => {
  if (activeTab.value === 'create') return 'Create'
  if (activeTab.value === 'spec') return 'Spec'
  return 'Ship'
})

const panelDescription = computed(() => {
  if (activeTab.value === 'create') return 'Prompt first. Generate something simple, then refine.'
  if (activeTab.value === 'spec') return 'Capture product intent, requirements, and design decisions.'
  return 'Export first. Code and handoff stay close, but secondary.'
})
</script>

<template>
  <aside
    data-test-id="properties-panel"
    class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel select-text"
  >
    <div class="border-b border-border px-3 py-3">
      <div class="mb-2 flex items-center gap-1 rounded-lg bg-inset p-1">
        <button
          class="flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
          :class="activeTab === 'create' ? 'bg-accent text-white' : 'text-muted hover:text-surface'"
          @click="activeTab = 'create'"
        >
          Create
        </button>
        <button
          class="flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
          :class="activeTab === 'spec' ? 'bg-accent text-white' : 'text-muted hover:text-surface'"
          @click="activeTab = 'spec'"
        >
          Spec
        </button>
        <button
          class="flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
          :class="activeTab === 'ship' ? 'bg-accent text-white' : 'text-muted hover:text-surface'"
          @click="activeTab = 'ship'"
        >
          Ship
        </button>
      </div>
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-[13px] font-semibold text-surface">{{ panelTitle }}</div>
          <div class="mt-0.5 text-[11px] leading-relaxed text-muted">{{ panelDescription }}</div>
        </div>
        <button
          v-if="activeTab === 'create'"
          class="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted transition hover:bg-hover hover:text-surface"
          @click="showBrandSettings = !showBrandSettings"
        >
          {{ showBrandSettings ? 'Hide brand' : 'Brand' }}
        </button>
      </div>
    </div>

    <div v-if="activeTab === 'create'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatPanel class="flex-1" />
      <div v-if="showBrandSettings" class="max-h-[42%] border-t border-border bg-inset/20">
        <div class="flex items-center justify-between border-b border-border px-3 py-2">
          <div>
            <div class="text-[12px] font-semibold text-surface">Brand</div>
            <div class="text-[10px] text-muted">Project-level style controls</div>
          </div>
          <button class="text-[11px] text-muted hover:text-surface" @click="showBrandSettings = false">
            Close
          </button>
        </div>
        <div class="h-[280px] overflow-y-auto">
          <BrandSettings />
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'spec'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
        <button
          class="rounded px-2 py-1 text-[11px]"
          :class="specTab === 'summary' ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
          @click="specTab = 'summary'"
        >
          Summary
        </button>
        <button
          class="rounded px-2 py-1 text-[11px]"
          :class="specTab === 'requirements' ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
          @click="specTab = 'requirements'"
        >
          Requirements
        </button>
        <button
          class="rounded px-2 py-1 text-[11px]"
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

    <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TabsRoot v-model="shipTab" class="flex min-h-0 flex-1 flex-col">
        <TabsList class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
          <TabsTrigger
            value="export"
            data-test-id="properties-tab-export"
            class="rounded px-2 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:bg-hover data-[state=active]:font-semibold data-[state=active]:text-surface"
          >
            Export
          </TabsTrigger>
          <TabsTrigger
            value="code"
            data-test-id="properties-tab-code"
            class="rounded px-2 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:bg-hover data-[state=active]:font-semibold data-[state=active]:text-surface"
          >
            Code
          </TabsTrigger>
          <TabsTrigger
            value="handoff"
            data-test-id="properties-tab-handoff"
            class="rounded px-2 py-1 text-[11px] text-muted hover:text-surface data-[state=active]:bg-hover data-[state=active]:font-semibold data-[state=active]:text-surface"
          >
            Handoff
          </TabsTrigger>
        </TabsList>

        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div v-if="shipTab === 'export'" class="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <ExportPanel />
          </div>
          <div v-else-if="shipTab === 'code'" class="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <CodePanel />
          </div>
          <div v-else class="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <HandoffPanel />
          </div>
        </div>
      </TabsRoot>
    </div>
  </aside>
</template>
