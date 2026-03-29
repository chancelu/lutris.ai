<script setup lang="ts">
import { computed } from 'vue'

import { useEditorStore } from '@/stores/editor'
import AssetsPanel from './AssetsPanel.vue'
import LayerTree from './LayerTree.vue'
import PagesPanel from './PagesPanel.vue'

const store = useEditorStore()

const emit = defineEmits<{
  collapse: []
}>()

const currentTab = computed(() => store.state.leftPanelTab)
</script>

<template>
  <div
    data-test-id="layers-panel"
    class="flex min-w-0 flex-1 flex-col overflow-hidden"
  >
    <!-- Close button -->
    <div class="flex shrink-0 items-center justify-between px-2 py-1.5">
      <span class="text-[11px] font-medium capitalize text-surface">{{ currentTab }}</span>
      <button
        class="flex size-6 items-center justify-center rounded-lg text-muted transition hover:bg-hover hover:text-surface"
        title="Close"
        @click="emit('collapse')"
      >
        <icon-lucide-x class="size-3.5" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <LayerTree v-if="currentTab === 'layers'" data-test-id="layers-tree" />
      <AssetsPanel v-else-if="currentTab === 'assets'" />
      <PagesPanel v-else-if="currentTab === 'pages'" />
    </div>
  </div>
</template>
