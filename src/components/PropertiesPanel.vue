<script setup lang="ts">
import { ref, watch } from 'vue'
import { TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import { useAIChat } from '@/composables/use-chat'
import { useEditorStore } from '@/stores/editor'
import { useI18n } from '@/composables/use-i18n'

import ChatPanel from './ChatPanel.vue'
import CodePanel from './CodePanel.vue'
import ExportPanel from './ExportPanel.vue'
import BrandSettings from './BrandSettings.vue'
import HandoffPanel from './HandoffPanel.vue'

const store = useEditorStore()
const { activeTab } = useAIChat()
const { t } = useI18n()

// Secondary tab for bottom section
const secondaryTab = ref<'code' | 'handoff' | 'export' | 'brand'>('code')

// Auto-toggle measurement mode when Handoff tab is active
watch(secondaryTab, (tab) => {
  store.state.measurementMode = tab === 'handoff'
})
</script>

<template>
  <aside
    data-test-id="properties-panel"
    class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-border bg-panel"
  >
    <!-- AI Chat (primary, takes most space) -->
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ChatPanel />
    </div>

    <!-- Secondary tabs (bottom) -->
    <div class="flex shrink-0 flex-col border-t border-border" style="max-height: 40%">
      <TabsRoot v-model="secondaryTab" class="flex flex-col min-h-0 flex-1">
        <TabsList class="flex shrink-0 items-center gap-0.5 border-b border-border px-1 py-1 scrollbar-none">
          <TabsTrigger
            value="code"
            data-test-id="properties-tab-code"
            class="relative flex items-center gap-1 rounded px-2 py-1.5 text-[11px] text-muted hover:text-surface data-[state=active]:text-surface data-[state=active]:bg-hover/50"
          >
            <icon-lucide-code class="size-3.5" />
            <span>Code</span>
          </TabsTrigger>
          <TabsTrigger
            value="handoff"
            data-test-id="properties-tab-handoff"
            class="relative flex items-center gap-1 rounded px-2 py-1.5 text-[11px] text-muted hover:text-surface data-[state=active]:text-surface data-[state=active]:bg-hover/50"
          >
            <icon-lucide-package class="size-3.5" />
            <span>Handoff</span>
          </TabsTrigger>
          <TabsTrigger
            value="export"
            data-test-id="properties-tab-export"
            class="relative flex items-center gap-1 rounded px-2 py-1.5 text-[11px] text-muted hover:text-surface data-[state=active]:text-surface data-[state=active]:bg-hover/50"
          >
            <icon-lucide-download class="size-3.5" />
            <span>Export</span>
          </TabsTrigger>
          <TabsTrigger
            value="brand"
            data-test-id="properties-tab-brand"
            class="relative flex items-center gap-1 rounded px-2 py-1.5 text-[11px] text-muted hover:text-surface data-[state=active]:text-surface data-[state=active]:bg-hover/50"
          >
            <icon-lucide-paintbrush class="size-3.5" />
            <span>Brand</span>
          </TabsTrigger>
        </TabsList>

        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div v-if="secondaryTab === 'code'" class="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <CodePanel />
          </div>
          <div v-if="secondaryTab === 'handoff'" class="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <HandoffPanel />
          </div>
          <div v-if="secondaryTab === 'export'" class="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <ExportPanel />
          </div>
          <div v-if="secondaryTab === 'brand'" class="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <BrandSettings />
          </div>
        </div>
      </TabsRoot>
    </div>
  </aside>
</template>
