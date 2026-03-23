<script setup lang="ts">
import { computed, ref } from 'vue'

import { useEditorStore } from '@/stores/editor'

import AppearanceSection from './properties/AppearanceSection.vue'
import EffectsSection from './properties/EffectsSection.vue'
import FillSection from './properties/FillSection.vue'
import LayoutSection from './properties/LayoutSection.vue'
import PositionSection from './properties/PositionSection.vue'
import StrokeSection from './properties/StrokeSection.vue'
import TypographySection from './properties/TypographySection.vue'

const store = useEditorStore()

const node = computed(() => store.selectedNode.value)
const multiCount = computed(() => store.selectedNodes.value.length)
const hasSelection = computed(() => multiCount.value > 0 || !!node.value)

const collapsed = ref(false)

// Sections that can be individually collapsed
const sections = ref({
  position: true,
  layout: true,
  appearance: true,
  typography: true,
  fill: true,
  stroke: true,
  effects: false,
})

function toggleSection(key: keyof typeof sections.value) {
  sections.value = { ...sections.value, [key]: !sections.value[key] }
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="hasSelection"
      class="absolute right-3 bottom-14 z-30 w-[260px] max-h-[60vh] rounded-xl border border-border bg-panel/95 shadow-xl backdrop-blur-md overflow-hidden"
      data-test-id="floating-inspector"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between border-b border-border px-3 py-1.5 cursor-pointer select-none"
        @click="collapsed = !collapsed"
      >
        <div class="flex items-center gap-1.5 min-w-0">
          <icon-lucide-sliders-horizontal class="size-3.5 shrink-0 text-muted" />
          <span v-if="multiCount > 1" class="truncate text-[11px] font-medium text-surface">
            {{ multiCount }} layers
          </span>
          <span v-else-if="node" class="truncate text-[11px] font-medium text-surface">
            {{ node.name || node.type }}
          </span>
        </div>
        <icon-lucide-chevron-down
          class="size-3.5 text-muted transition-transform"
          :class="{ 'rotate-180': collapsed }"
        />
      </div>

      <!-- Body -->
      <div v-show="!collapsed" class="scrollbar-thin overflow-y-auto max-h-[calc(60vh-36px)]">
        <!-- Multi-select -->
        <template v-if="multiCount > 1">
          <PositionSection />
          <AppearanceSection />
          <FillSection />
          <StrokeSection />
          <EffectsSection />
        </template>

        <!-- Single selection -->
        <template v-else-if="node">
          <PositionSection />
          <LayoutSection />
          <AppearanceSection />
          <TypographySection v-if="node.type === 'TEXT'" />
          <FillSection />
          <StrokeSection />
          <EffectsSection />
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
