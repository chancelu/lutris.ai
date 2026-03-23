<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { ref, computed } from 'vue'

import { useI18n } from '@/composables/use-i18n'
import { useProjects } from '@/composables/use-projects'
import AppMenu from './AppMenu.vue'
import AssetsPanel from './AssetsPanel.vue'
import LayerTree from './LayerTree.vue'
import PagesPanel from './PagesPanel.vue'
import ProjectManager from './ProjectManager.vue'
import TemplateLibrary from './TemplateLibrary.vue'
import ComponentLibrary from './ComponentLibrary.vue'
import UndoHistoryPanel from './UndoHistoryPanel.vue'
import ProductDocPanel from './ProductDocPanel.vue'

const leftTab = ref<'layers' | 'assets' | 'doc' | 'templates' | 'components' | 'history'>('layers')
const { t } = useI18n()
const { projects, activeProject, switchProject, activeProjectId } = useProjects()

const showProjectDropdown = ref(false)

async function onSelectProject(projectId: string) {
  showProjectDropdown.value = false
  if (projectId !== activeProjectId.value) {
    await switchProject(projectId)
  }
}
</script>

<template>
  <aside
    data-test-id="layers-panel"
    class="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-panel"
    style="contain: paint layout style"
  >
    <AppMenu />

    <!-- Project Switcher -->
    <div class="relative shrink-0 border-b border-border px-3 py-2">
      <button
        class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-hover"
        @click="showProjectDropdown = !showProjectDropdown"
      >
        <icon-lucide-folder-open class="size-4 shrink-0 text-accent" />
        <span class="min-w-0 flex-1 truncate text-[13px] font-medium text-surface">
          {{ activeProject?.name || 'No Project' }}
        </span>
        <icon-lucide-chevron-down class="size-3.5 shrink-0 text-muted" />
      </button>
      <!-- Dropdown -->
      <div
        v-if="showProjectDropdown"
        class="absolute left-2 right-2 top-full z-50 mt-1 rounded-lg border border-border bg-panel shadow-xl"
      >
        <div class="max-h-48 overflow-y-auto p-1">
          <button
            v-for="proj in projects"
            :key="proj.id"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-hover"
            :class="proj.id === activeProjectId ? 'bg-accent/10 text-accent' : 'text-surface'"
            @click="onSelectProject(proj.id)"
          >
            <icon-lucide-folder class="size-3.5 shrink-0" />
            <span class="truncate">{{ proj.name }}</span>
          </button>
        </div>
      </div>
    </div>

    <SplitterGroup direction="vertical" auto-save-id="layers-layout" class="flex-1 overflow-hidden">
      <!-- PRD Section -->
      <SplitterPanel
        :default-size="30"
        :min-size="10"
        :max-size="50"
        class="flex flex-col overflow-hidden"
      >
        <div class="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-muted">PRD</span>
        </div>
        <ProductDocPanel />
      </SplitterPanel>
      <SplitterResizeHandle class="group relative z-10 -my-1 h-2 cursor-row-resize">
        <div class="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
      </SplitterResizeHandle>

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
        <div class="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
      </SplitterResizeHandle>

      <!-- Bottom tabs: Layers / Assets / Components / Templates / History -->
      <SplitterPanel :default-size="50" :min-size="20" class="flex flex-col overflow-hidden">
        <div class="flex shrink-0 items-center border-b border-border">
          <button
            data-test-id="left-tab-layers"
            class="relative flex-1 flex items-center justify-center py-2"
            :class="leftTab === 'layers' ? 'text-surface' : 'text-muted hover:text-surface'"
            :title="t('tab.layers')"
            @click="leftTab = 'layers'"
          >
            <icon-lucide-layers class="size-4" />
            <span v-if="leftTab === 'layers'" class="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-accent" />
          </button>
          <button
            data-test-id="left-tab-assets"
            class="relative flex-1 flex items-center justify-center py-2"
            :class="leftTab === 'assets' ? 'text-surface' : 'text-muted hover:text-surface'"
            :title="t('tab.assets')"
            @click="leftTab = 'assets'"
          >
            <icon-lucide-box class="size-4" />
            <span v-if="leftTab === 'assets'" class="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-accent" />
          </button>
          <button
            data-test-id="left-tab-components"
            class="relative flex-1 flex items-center justify-center py-2"
            :class="leftTab === 'components' ? 'text-surface' : 'text-muted hover:text-surface'"
            :title="t('tab.components')"
            @click="leftTab = 'components'"
          >
            <icon-lucide-puzzle class="size-4" />
            <span v-if="leftTab === 'components'" class="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-accent" />
          </button>
          <button
            data-test-id="left-tab-templates"
            class="relative flex-1 flex items-center justify-center py-2"
            :class="leftTab === 'templates' ? 'text-surface' : 'text-muted hover:text-surface'"
            :title="t('tab.templates')"
            @click="leftTab = 'templates'"
          >
            <icon-lucide-layout-template class="size-4" />
            <span v-if="leftTab === 'templates'" class="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-accent" />
          </button>
          <button
            data-test-id="left-tab-history"
            class="relative flex-1 flex items-center justify-center py-2"
            :class="leftTab === 'history' ? 'text-surface' : 'text-muted hover:text-surface'"
            :title="t('tab.history')"
            @click="leftTab = 'history'"
          >
            <icon-lucide-history class="size-4" />
            <span v-if="leftTab === 'history'" class="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full bg-accent" />
          </button>
        </div>
        <LayerTree v-if="leftTab === 'layers'" data-test-id="layers-tree" />
        <AssetsPanel v-else-if="leftTab === 'assets'" />
        <TemplateLibrary v-else-if="leftTab === 'templates'" />
        <ComponentLibrary v-else-if="leftTab === 'components'" />
        <UndoHistoryPanel v-else />
      </SplitterPanel>
    </SplitterGroup>
  </aside>
</template>
