<script setup lang="ts">
import { computed, ref } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import HsvColorArea from './HsvColorArea.vue'
import ScrubInput from './ScrubInput.vue'
import { colorToCSS, colorToHexRaw, parseColor } from '@llc3233149/core'
import type { Color, Fill } from '@llc3233149/core'

const { fill } = defineProps<{ fill: Fill }>()
const emit = defineEmits<{ update: [fill: Fill] }>()

const hexInput = ref('')

const isSolid = computed(() => fill.type === 'SOLID')

const displayColor = computed<Color>(() => {
  if (isSolid.value) return fill.color
  // For non-solid fills, extract first color or fallback
  if (fill.gradientStops?.length) return fill.gradientStops[0].color
  return fill.color
})

const swatchBackground = computed(() => colorToCSS(displayColor.value))

const hexValue = computed(() => colorToHexRaw(displayColor.value))

const opacityPercent = computed(() => Math.round(displayColor.value.a * 100))

function onColorUpdate(color: Color) {
  if (!isSolid.value) {
    // Convert to solid when user picks a color
    emit('update', { ...fill, type: 'SOLID', color })
    return
  }
  emit('update', { ...fill, color })
}

function onHexChange(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const hex = raw.startsWith('#') ? raw : `#${raw}`
  const color = parseColor(hex)
  if (!color) return
  emit('update', { ...fill, type: 'SOLID', color: { ...color, a: displayColor.value.a } })
}

function onOpacityChange(value: number) {
  const a = Math.max(0, Math.min(100, value)) / 100
  const color = { ...displayColor.value, a }
  emit('update', { ...fill, type: 'SOLID', color })
}
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <button
        data-test-id="fill-picker-swatch"
        class="size-5 shrink-0 cursor-pointer rounded border border-border p-0"
        :style="{ background: swatchBackground }"
      />
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        class="z-[100] w-60 rounded-lg border border-border bg-panel p-2 shadow-xl"
        :side-offset="4"
        side="left"
      >
        <div v-if="!isSolid" class="mb-2 rounded bg-hover/50 px-2 py-1 text-[11px] text-muted">
          Only solid fills supported. Editing as solid color.
        </div>

        <HsvColorArea :color="displayColor" @update="onColorUpdate" />

        <!-- Hex input + opacity -->
        <div class="mt-2 flex items-center gap-1.5">
          <span class="text-[11px] text-muted">#</span>
          <input
            class="min-w-0 flex-1 rounded border border-border bg-input px-1.5 py-0.5 font-mono text-[13px] text-surface"
            :value="hexValue"
            maxlength="6"
            @change="onHexChange"
          />
          <ScrubInput
            class="w-12"
            suffix="%"
            :model-value="opacityPercent"
            :min="0"
            :max="100"
            @update:model-value="onOpacityChange"
          />
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
