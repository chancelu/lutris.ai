<script setup lang="ts">
import { computed, ref } from 'vue'
import { ScrollAreaRoot, ScrollAreaViewport } from 'reka-ui'
import { colorToCSS } from '@llc3233149/core'
import { useEditorStore } from '@/stores/editor'
import type { SceneNode } from '@llc3233149/core'

const store = useEditorStore()
const copiedKey = ref('')

const selectedNode = computed<SceneNode | null>(() => {
  void store.state.sceneVersion
  const ids = [...store.state.selectedIds]
  if (ids.length !== 1) return null
  return store.graph.getNode(ids[0]) ?? null
})

function fillToHex(fill: unknown): string | null {
  if (!fill) return null
  if (Array.isArray(fill) && fill.length > 0) {
    const f = fill[0]
    if (f?.color) return colorToCSS(f.color)
  }
  if (typeof fill === 'object' && fill !== null && 'r' in fill) return colorToCSS(fill as any)
  return null
}

function collectLayoutProps(node: SceneNode, items: { name: string; value: string }[]) {
  const abs = store.graph.getAbsolutePosition(node.id)
  items.push({ name: 'x', value: `${Math.round(abs?.x ?? node.x ?? 0)}px` })
  items.push({ name: 'y', value: `${Math.round(abs?.y ?? node.y ?? 0)}px` })
  if (node.width) items.push({ name: 'width', value: `${Math.round(node.width)}px` })
  if (node.height) items.push({ name: 'height', value: `${Math.round(node.height)}px` })
  if (node.rotation) items.push({ name: 'rotation', value: `${Math.round(node.rotation)}deg` })
  if (node.opacity !== undefined && node.opacity !== 1) items.push({ name: 'opacity', value: String(node.opacity) })
}

function collectStyleProps(node: SceneNode, items: { name: string; value: string }[]) {
  const bg = fillToHex(node.fill)
  if (bg) items.push({ name: 'background-color', value: bg })
  if (node.stroke) {
    const s = fillToHex(node.stroke)
    if (s) items.push({ name: 'border-color', value: s })
  }
  if (node.strokeWeight) items.push({ name: 'border-width', value: `${node.strokeWeight}px` })
  if (node.cornerRadius) items.push({ name: 'border-radius', value: `${node.cornerRadius}px` })
  if (node.type === 'text' || node.type === 'TEXT') {
    if (node.fontFamily) items.push({ name: 'font-family', value: node.fontFamily })
    if (node.fontSize) items.push({ name: 'font-size', value: `${node.fontSize}px` })
    if (node.fontWeight) items.push({ name: 'font-weight', value: String(node.fontWeight) })
    if (node.lineHeight) items.push({ name: 'line-height', value: String(node.lineHeight) })
  }
}

const cssProps = computed<{ name: string; value: string }[]>(() => {
  const node = selectedNode.value
  if (!node) return []
  const items: { name: string; value: string }[] = []
  collectLayoutProps(node, items)
  collectStyleProps(node, items)
  return items
})

function copy(value: string, key: string) {
  navigator.clipboard.writeText(value)
  copiedKey.value = key
  setTimeout(() => (copiedKey.value = ''), 1500)
}
</script>

<template>
  <div v-if="!selectedNode" class="flex flex-1 items-center justify-center px-4 text-center">
    <span class="text-xs text-muted">Select a layer to see CSS properties</span>
  </div>
  <ScrollAreaRoot v-else class="min-h-0 flex-1">
    <ScrollAreaViewport class="size-full">
      <div class="p-3">
        <div
          v-for="prop in cssProps"
          :key="prop.name"
          class="flex cursor-pointer items-center justify-between border-b border-border/50 py-1 hover:bg-hover/40"
          @click="copy(prop.value, prop.name)"
        >
          <span class="text-[12px] text-muted">{{ prop.name }}</span>
          <span class="font-mono text-[12px] text-surface">
            {{ copiedKey === prop.name ? 'Copied!' : prop.value }}
          </span>
        </div>
      </div>
    </ScrollAreaViewport>
  </ScrollAreaRoot>
</template>
