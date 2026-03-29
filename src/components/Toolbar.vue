<script setup lang="ts">
import { TOOLS, useEditorStore } from '@/stores/editor'
import { toolIcons } from '@/utils/tools'

const store = useEditorStore()
</script>

<template>
  <div class="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center">
    <div
      data-test-id="toolbar"
      class="flex gap-1 rounded-full border border-border/10 bg-panel/90 px-2 py-1.5 shadow-lg shadow-black/15 backdrop-blur-md"
    >
      <button
        v-for="tool in TOOLS"
        :key="tool.key"
        :data-test-id="`toolbar-tool-${tool.key.toLowerCase()}`"
        class="flex size-9 cursor-pointer items-center justify-center rounded-full border-none transition-all duration-150 hover:scale-110"
        :class="
          store.state.activeTool === tool.key
            ? 'bg-accent text-white shadow-sm shadow-accent/25'
            : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
        "
        :title="`${tool.label} (${tool.shortcut})`"
        @click="store.setTool(tool.key)"
      >
        <component :is="toolIcons[tool.key]" class="size-[18px]" />
      </button>
    </div>
  </div>
</template>
