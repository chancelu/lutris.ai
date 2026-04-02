<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ContextMenuRoot, ContextMenuTrigger, ContextMenuPortal } from 'reka-ui'

import IconCircle from '~icons/lucide/circle'
import IconComponent from '~icons/lucide/diamond'
import IconComponentSet from '~icons/lucide/component'
import IconColumns from '~icons/lucide/columns-3'
import IconFrame from '~icons/lucide/frame'
import IconGrid from '~icons/lucide/grid-3x3'
import IconGroup from '~icons/lucide/group'
import IconMinus from '~icons/lucide/minus'
import IconPenTool from '~icons/lucide/pen-tool'
import IconRows from '~icons/lucide/rows-3'
import IconSection from '~icons/lucide/layout-grid'
import IconSquare from '~icons/lucide/square'
import IconType from '~icons/lucide/type'

import { useEditorStore } from '@/stores/editor'
import NodeContextMenuContent from './NodeContextMenuContent.vue'

const store = useEditorStore()

interface FlatNode {
  id: string
  name: string
  type: string
  layoutMode: string
  visible: boolean
  depth: number
  hasChildren: boolean
}

const nodeIcons: Partial<Record<string, typeof IconSquare>> = {
  SECTION: IconSection,
  ELLIPSE: IconCircle,
  FRAME: IconFrame,
  GROUP: IconGroup,
  COMPONENT: IconComponent,
  COMPONENT_SET: IconComponentSet,
  INSTANCE: IconComponent,
  LINE: IconMinus,
  TEXT: IconType,
  VECTOR: IconPenTool,
  RECTANGLE: IconSquare,
}

const autoLayoutIcons: Partial<Record<string, typeof IconSquare>> = {
  VERTICAL: IconRows,
  HORIZONTAL: IconColumns,
  GRID: IconGrid,
}

function nodeIcon(node: FlatNode) {
  if (node.type === 'FRAME' && node.layoutMode !== 'NONE') {
    return autoLayoutIcons[node.layoutMode] ?? IconFrame
  }
  return nodeIcons[node.type] ?? IconSquare
}

const COMPONENT_TYPES = new Set(['COMPONENT', 'COMPONENT_SET', 'INSTANCE'])

const collapsed = ref(new Set<string>())

function toggleCollapse(id: string) {
  const next = new Set(collapsed.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsed.value = next
}

function flattenAll(parentId: string, depth = 0): FlatNode[] {
  const parent = store.graph.getNode(parentId)
  if (!parent) return []
  const result: FlatNode[] = []
  for (const cid of parent.childIds) {
    const node = store.graph.getNode(cid)
    if (!node) continue
    const hasChildren = node.childIds.length > 0
    result.push({
      id: node.id,
      name: node.name,
      type: node.type,
      layoutMode: node.layoutMode,
      visible: node.visible,
      depth,
      hasChildren,
    })
    if (hasChildren && !collapsed.value.has(node.id)) {
      result.push(...flattenAll(node.id, depth + 1))
    }
  }
  return result
}

const nodes = ref<FlatNode[]>(flattenAll(store.state.currentPageId))

watch([() => store.state.sceneVersion, () => store.state.currentPageId, collapsed], () => {
  nodes.value = flattenAll(store.state.currentPageId)
})

const listRef = ref<HTMLElement | null>(null)

watch(
  () => store.state.selectedIds,
  (ids) => {
    nextTick(() => {
      const first = [...ids][0]
      if (!first) return
      const el = listRef.value?.querySelector<HTMLElement>(`[data-node-id="${first}"]`)
      el?.scrollIntoView({ block: 'nearest' })
    })
  },
)

function onClick(e: MouseEvent, nodeId: string) {
  if (e.shiftKey || e.ctrlKey || e.metaKey) {
    store.select([nodeId], true)
  } else {
    store.select([nodeId])
  }
}

function onLayerRightClick(e: MouseEvent) {
  const row = (e.target as HTMLElement).closest<HTMLElement>('[data-node-id]')
  if (!row) return
  const nodeId = row.dataset.nodeId
  if (!nodeId) return
  if (!store.state.selectedIds.has(nodeId)) {
    store.select([nodeId])
  }
}

const contextNodeId = computed(() => {
  const ids = store.state.selectedIds
  return ids.size > 0 ? [...ids][0] : null
})

// --- Drag & Drop ---
const dragState = ref<{
  dragId: string
  targetId: string
  position: 'before' | 'inside' | 'after'
} | null>(null)

function onDragStart(e: DragEvent, nodeId: string) {
  if (!e.dataTransfer) return
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', nodeId)
  dragState.value = { dragId: nodeId, targetId: '', position: 'before' }
}

function onDragOver(e: DragEvent, nodeId: string) {
  if (!dragState.value || dragState.value.dragId === nodeId) return
  if (store.graph.isDescendant(nodeId, dragState.value.dragId)) return
  e.preventDefault()
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top
  const ratio = y / rect.height
  let position: 'before' | 'inside' | 'after'
  if (ratio < 0.25) position = 'before'
  else if (ratio > 0.75) position = 'after'
  else position = store.graph.isContainer(nodeId) ? 'inside' : (ratio < 0.5 ? 'before' : 'after')
  dragState.value = { ...dragState.value, targetId: nodeId, position }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  const ds = dragState.value
  if (!ds || !ds.targetId) return
  const { dragId, targetId, position } = ds
  dragState.value = null
  if (dragId === targetId) return
  if (store.graph.isDescendant(targetId, dragId)) return

  const target = store.graph.getNode(targetId)
  if (!target) return

  if (position === 'inside') {
    store.reorderChildWithUndo(dragId, targetId, target.childIds.length)
  } else {
    const parentId = target.parentId ?? store.state.currentPageId
    const parent = store.graph.getNode(parentId)
    if (!parent) return
    const idx = parent.childIds.indexOf(targetId)
    store.reorderChildWithUndo(dragId, parentId, position === 'before' ? idx : idx + 1)
  }
  store.requestRender()
}

function onDragEnd() {
  dragState.value = null
}

function dropClass(nodeId: string): string {
  const ds = dragState.value
  if (!ds || ds.targetId !== nodeId) return ''
  if (ds.position === 'before') return 'layer-drop-before'
  if (ds.position === 'after') return 'layer-drop-after'
  return 'layer-drop-inside'
}
</script>

<template>
  <ContextMenuRoot :modal="false">
    <ContextMenuTrigger as-child @contextmenu="onLayerRightClick">
      <div ref="listRef" class="scrollbar-thin flex-1 overflow-y-auto px-1">
        <button
          v-for="node in nodes"
          :key="node.id"
          :data-node-id="node.id"
          data-test-id="layers-item"
          draggable="true"
          class="flex w-full cursor-pointer items-center gap-1 rounded border-none py-1 text-left text-xs"
          :style="{ paddingLeft: `${4 + node.depth * 16}px` }"
          :class="[
            store.state.selectedIds.has(node.id)
              ? 'bg-accent text-white'
              : 'bg-transparent text-surface hover:bg-hover',
            !node.visible ? 'opacity-50' : '',
            dropClass(node.id),
          ]"
          @click="onClick($event, node.id)"
          @dragstart="onDragStart($event, node.id)"
          @dragover="onDragOver($event, node.id)"
          @drop="onDrop($event)"
          @dragend="onDragEnd"
        >
          <span
            class="flex size-4 shrink-0 items-center justify-center"
            @click.stop="node.hasChildren && toggleCollapse(node.id)"
          >
            <icon-lucide-chevron-right
              v-if="node.hasChildren"
              class="size-3 text-muted transition-transform"
              :class="!collapsed.has(node.id) && 'rotate-90'"
            />
          </span>
          <component
            :is="nodeIcon(node)"
            class="size-3 shrink-0"
            :class="COMPONENT_TYPES.has(node.type) ? 'text-[#9747ff] opacity-100' : 'opacity-70'"
          />
          <span class="min-w-0 flex-1 truncate">{{ node.name }}</span>
          <icon-lucide-eye-off
            v-if="!node.visible"
            class="size-3 shrink-0 text-muted"
          />
        </button>
      </div>
    </ContextMenuTrigger>
    <ContextMenuPortal>
      <NodeContextMenuContent />
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>

<style scoped>
.layer-drop-before {
  border-top: 2px solid var(--color-accent, #3b82f6);
}
.layer-drop-after {
  border-bottom: 2px solid var(--color-accent, #3b82f6);
}
.layer-drop-inside {
  background-color: color-mix(in srgb, var(--color-accent, #3b82f6) 20%, transparent);
}
</style>
