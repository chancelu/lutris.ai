<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

import { useEditorStore } from '@/stores/editor'
import { useAIChat } from '@/composables/use-chat'
import { useAISelect } from '@/composables/use-ai-select'
import DesignPanel from './DesignPanel.vue'
import LayersPanel from './LayersPanel.vue'

const store = useEditorStore()
const { focusRequested } = useAIChat()
const { addCurrentSelection } = useAISelect()

const hasSelection = computed(() => (store.state.selectedIds?.size ?? 0) > 0)

// Left rail: collapsed to a 48px icon rail by default (persisted); clicking an
// icon expands the full 280px sidebar with that section active, clicking the
// active icon (or the chevron) collapses back.
const railCollapsed = useLocalStorage('lutris:left-rail-collapsed', true)
const activeSection = ref<'layers' | 'design'>('layers')

function toggleSection(section: 'layers' | 'design') {
  if (!railCollapsed.value && activeSection.value === section) {
    railCollapsed.value = true
    return
  }
  activeSection.value = section
  railCollapsed.value = false
}

function editWithAI() {
  addCurrentSelection()
  focusRequested.value++
}
</script>

<template>
  <!-- Collapsed: 48px icon rail -->
  <aside
    v-if="railCollapsed"
    data-test-id="left-rail"
    class="flex h-full w-12 shrink-0 flex-col items-center gap-1 bg-panel pt-3"
  >
    <button
      data-test-id="left-rail-layers"
      class="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-surface"
      title="Layers"
      @click="toggleSection('layers')"
    >
      <icon-lucide-layers class="size-4" />
    </button>
    <button
      data-test-id="left-rail-design"
      class="flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-surface"
      title="Design"
      @click="toggleSection('design')"
    >
      <icon-lucide-sliders-horizontal class="size-4" />
    </button>
  </aside>

  <!-- Expanded: 280px sidebar -->
  <aside
    v-else
    data-test-id="left-sidebar"
    class="flex h-full w-[280px] shrink-0 flex-col overflow-hidden bg-panel"
  >
    <!-- Sidebar header: section switch + collapse -->
    <div class="flex shrink-0 items-center gap-0.5 px-2 py-1.5">
      <button
        data-test-id="left-sidebar-layers-tab"
        class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition"
        :class="activeSection === 'layers' ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
        @click="toggleSection('layers')"
      >
        <icon-lucide-layers class="size-3.5" />
        Layers
      </button>
      <button
        data-test-id="left-sidebar-design-tab"
        class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition"
        :class="activeSection === 'design' ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
        @click="toggleSection('design')"
      >
        <icon-lucide-sliders-horizontal class="size-3.5" />
        Design
      </button>
      <div class="flex-1" />
      <button
        data-test-id="left-sidebar-collapse"
        class="flex size-6 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-surface"
        title="Collapse sidebar"
        @click="railCollapsed = true"
      >
        <icon-lucide-chevrons-left class="size-3.5" />
      </button>
    </div>

    <!-- Layers section -->
    <div v-show="activeSection === 'layers'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <LayersPanel @collapse="railCollapsed = true" />
    </div>

    <!-- Design section -->
    <div v-show="activeSection === 'design'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <template v-if="hasSelection">
        <DesignPanel class="flex-1" />
        <div class="shrink-0 p-3">
          <button
            class="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-3 py-2.5 text-[12px] font-medium text-white shadow-sm shadow-accent/20 transition hover:bg-accent/80"
            @click="editWithAI"
          >
            <icon-lucide-sparkles class="size-3.5" />
            Edit with AI
          </button>
        </div>
      </template>
      <div v-else class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <img src="/mascot-designing.png" class="h-16 w-auto object-contain opacity-70" alt="" />
        <p class="text-[11px] text-muted">Select a layer to edit its design.</p>
      </div>
    </div>
  </aside>
</template>
