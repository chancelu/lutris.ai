<script setup lang="ts">
import { computed } from 'vue'

import { useEditorStore } from '@/stores/editor'

import AppearanceSection from './properties/AppearanceSection.vue'
import ExportSection from './properties/ExportSection.vue'
import FillSection from './properties/FillSection.vue'
import PageSection from './properties/PageSection.vue'
import PositionSection from './properties/PositionSection.vue'
import VariablesSection from './properties/VariablesSection.vue'

const store = useEditorStore()

const node = computed(() => store.selectedNode.value)
const multiCount = computed(() => store.selectedNodes.value.length)
const isComponentType = computed(() => {
  const t = node.value?.type
  return t === 'COMPONENT' || t === 'COMPONENT_SET' || t === 'INSTANCE'
})

const mainColor = computed(() => {
  const n = node.value
  if (!n) return null
  const fills = (n as any).fills
  if (!fills?.length) return null
  const fill = fills[0]
  if (fill.type === 'SOLID' && fill.color) {
    const { r, g, b } = fill.color
    return `#${[r, g, b].map((c: number) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`
  }
  return null
})
</script>

<template>
  <!-- Multi-select summary -->
  <div
    v-if="multiCount > 1"
    data-test-id="design-panel-multi"
    class="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
  >
    <div
      data-test-id="design-multi-header"
      class="flex items-center gap-2 px-3 py-3"
    >
      <div class="flex size-8 items-center justify-center rounded-lg bg-muted/10 text-muted">
        <icon-lucide-layers class="size-4" />
      </div>
      <div>
        <span class="text-[12px] font-semibold text-surface">{{ multiCount }} elements</span>
        <span class="block text-[10px] text-muted">Mixed selection</span>
      </div>
    </div>
    <PositionSection />
    <AppearanceSection />
    <FillSection />
  </div>

  <!-- Single selection — simplified card view -->
  <div
    v-else-if="node"
    data-test-id="design-panel-single"
    class="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
  >
    <!-- Element card header -->
    <div data-test-id="design-node-header" class="px-3 py-3">
      <div class="flex items-center gap-2">
        <div
          class="flex size-10 items-center justify-center rounded-lg"
          :class="mainColor ? '' : 'bg-muted/10'"
          :style="mainColor ? { background: mainColor + '20', border: '1px solid ' + mainColor + '30' } : {}"
        >
          <div
            v-if="mainColor"
            class="size-5 rounded"
            :style="{ background: mainColor }"
          />
          <icon-lucide-square v-else class="size-4 text-muted/50" />
        </div>
        <div class="min-w-0 flex-1">
          <span class="block truncate text-[13px] font-semibold text-surface">{{ node.name }}</span>
          <span class="text-[10px]" :class="isComponentType ? 'text-[#9747ff]' : 'text-muted'">{{ node.type }}</span>
        </div>
      </div>
    </div>

    <!-- Component actions -->
    <div
      v-if="node.type === 'INSTANCE'"
      class="flex flex-col gap-1 border-b border-border/10 px-3 py-2"
    >
      <button
        data-test-id="design-go-to-component"
        class="rounded bg-[#9747ff]/10 px-2 py-1 text-left text-[12px] text-[#9747ff] hover:bg-[#9747ff]/20"
        @click="store.goToMainComponent()"
      >
        Go to Main Component
      </button>
      <button
        data-test-id="design-detach-instance"
        class="rounded px-2 py-1 text-left text-[12px] text-muted hover:bg-hover"
        @click="store.detachInstance()"
      >
        Detach Instance
      </button>
    </div>

    <!-- Key properties only -->
    <PositionSection />
    <AppearanceSection />
    <FillSection />

    <ExportSection />
  </div>

  <div
    v-else
    data-test-id="design-panel-empty"
    class="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4"
  >
    <PageSection />
    <VariablesSection />
  </div>
</template>
