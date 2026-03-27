<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { ref } from 'vue'

import { useI18n } from '@/composables/use-i18n'
import AppMenu from './AppMenu.vue'
import AssetsPanel from './AssetsPanel.vue'
import LayerTree from './LayerTree.vue'
import PagesPanel from './PagesPanel.vue'
import TemplateLibrary from './TemplateLibrary.vue'
import ComponentLibrary from './ComponentLibrary.vue'
import UndoHistoryPanel from './UndoHistoryPanel.vue'

const leftTab = ref<'layers' | 'assets' | 'templates' | 'components' | 'history'>('layers')
const { t } = useI18n()

const emit = defineEmits<{
  collapse: []
}>()
</script>

<template>
  <aside
    data-test-id="layers-panel"
    class="flex min-w-0 flex-1 flex-col overflow-hidden bg-panel"
    style="contain: paint layout style"
  >
    <AppMenu />

    <SplitterGroup direction="vertical" auto-save-id="layers-layout" class="flex-1 overflow-hidden">
      <!-- Pages -->
      <SplitterPanel
        :default-size="20"
        :min-size="10"
        :max-size="40"
        class="flex flex-col overflow-hidden"
      >
        <PagesPanel />
      </SplitterPanel>
      <SplitterResizeHandle class="group relative z-10 -my-1 h-2 cursor-row-resize">
        <div class="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/50" />
      </SplitterResizeHandle>

      <!-- Main tabs: Layers / Assets -->
      <SplitterPanel :default-size="50" :min-size="20" class="flex flex-col overflow-hidden">
        <div class="flex shrink-0 items-center">
          <button
            data-test-id="left-tab-layers"
            class="relative flex flex-1 items-center justify-center py-2"
            :class="leftTab === 'layers' ? 'text-surface' : 'text-muted hover:text-surface'"
            :title="t('tab.layers')"
            @click="leftTab = 'layers'"
          >
            <icon-lucide-layers class="size-4" />
            <span v-if="leftTab === 'layers'" class="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-accent" />
          </button>
          <button
            data-test-id="left-tab-assets"
            class="relative flex flex-1 items-center justify-center py-2"
            :class="leftTab === 'assets' ? 'text-surface' : 'text-muted hover:text-surface'"
            :title="t('tab.assets')"
            @click="leftTab = 'assets'"
          >
            <icon-lucide-box class="size-4" />
            <span v-if="leftTab === 'assets'" class="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-accent" />
          </button>
        </div>
        <LayerTree v-if="leftTab === 'layers'" data-test-id="layers-tree" />
        <AssetsPanel v-else-if="leftTab === 'assets'" />
        <TemplateLibrary v-else-if="leftTab === 'templates'" />
        <ComponentLibrary v-else-if="leftTab === 'components'" />
        <UndoHistoryPanel v-else />
      </SplitterPanel>
    </SplitterGroup>

    <!-- Bottom toolbar: secondary tabs + collapse -->
    <div class="flex shrink-0 items-center justify-between border-t border-border/10 px-1 py-1">
      <div class="flex items-center gap-0.5">
        <button
          class="flex size-7 items-center justify-center rounded-lg transition"
          :class="leftTab === 'components' ? 'bg-hover text-surface' : 'text-muted hover:text-surface'"
          :title="t('tab.components')"
          @click="leftTab = 'components'"
        >
          <icon-lucide-puzzle class="size-3.5" />
        </button>
        <button
          class="flex size-7 items-center justify-center rounded-lg transition"
          :class="leftTab === 'templates' ? 'bg-hover text-surface' : 'text-muted hover:text-surface'"
          :title="t('tab.templates')"
          @click="leftTab = 'templates'"
        >
          <icon-lucide-layout-template class="size-3.5" />
        </button>
        <button
          class="flex size-7 items-center justify-center rounded-lg transition"
          :class="leftTab === 'history' ? 'bg-hover text-surface' : 'text-muted hover:text-surface'"
          :title="t('tab.history')"
          @click="leftTab = 'history'"
        >
          <icon-lucide-history class="size-3.5" />
        </button>
      </div>
      <button
        class="flex size-7 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-surface"
        title="Collapse panel"
        @click="emit('collapse')"
      >
        <icon-lucide-panel-left-close class="size-3.5" />
      </button>
    </div>
  </aside>
</template>
