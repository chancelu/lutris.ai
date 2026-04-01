<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import LayerTree from './LayerTree.vue'

const store = useEditorStore()

const emit = defineEmits<{
  collapse: []
}>()
</script>

<template>
  <div
    data-test-id="layers-panel"
    class="flex min-w-0 flex-1 flex-col overflow-hidden"
  >
    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <LayerTree data-test-id="layers-tree" />
    </div>
  </div>
</template>
