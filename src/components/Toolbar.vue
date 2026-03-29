<script setup lang="ts">
import { TOOLS, useEditorStore } from '@/stores/editor'
import { toolIcons } from '@/utils/tools'

const store = useEditorStore()
</script>

<template>
  <div class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center">
    <div
      data-test-id="toolbar"
      class="flex gap-0.5 rounded-xl bg-panel/90 p-1 shadow-lg shadow-black/10 backdrop-blur-sm"
    >
      <button
        v-for="tool in TOOLS"
        :key="tool.key"
        :data-test-id="`toolbar-tool-${tool.key.toLowerCase()}`"
        class="flex size-8 cursor-pointer items-center justify-center rounded-lg border-none transition-colors"
        :class="
          store.state.activeTool === tool.key
            ? 'bg-accent text-white'
            : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
        "
        :title="`${tool.label} (${tool.shortcut})`"
        @click="store.setTool(tool.key)"
      >
        <component :is="toolIcons[tool.key]" class="size-4" />
      </button>
    </div>
  </div>
</template>
