<script setup lang="ts">
import { ref, computed } from 'vue'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { useEditorStore } from '@/stores/editor'
import { useComponentDrag } from '@/composables/use-component-drag'

const { startDrag, endDrag } = useComponentDrag()

interface SavedComponent {
  id: string
  name: string
  nodeData: string // serialized node JSON
  thumbnail: string // emoji or base64
  category: string
  createdAt: number
}

const store = useEditorStore()
const STORAGE_KEY = 'designflow-components'

const components = ref<SavedComponent[]>([])
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const isNaming = ref(false)
const newName = ref('')
const newCategory = ref('Custom')

// Load
try {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) components.value = JSON.parse(raw)
} catch { /* ignore */ }

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(components.value))
  } catch { /* ignore */ }
}

const categories = computed(() => {
  const cats = new Set(components.value.map((c) => c.category))
  return [...cats]
})

const filtered = computed(() => {
  let list = components.value
  if (selectedCategory.value) {
    list = list.filter((c) => c.category === selectedCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((c) => c.name.toLowerCase().includes(q))
  }
  return list
})

function saveSelection() {
  if (store.state.selectedIds.size === 0) return
  isNaming.value = true
  newName.value = ''
}

function confirmSave() {
  if (!newName.value.trim()) return

  const ids = [...store.state.selectedIds]
  // Serialize selected nodes
  const nodes = ids.map((id) => {
    const node = store.graph.getNode(id)
    return node ? { id, ...JSON.parse(JSON.stringify(node)) } : null
  }).filter(Boolean)

  const comp: SavedComponent = {
    id: `comp_${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,
    name: newName.value.trim(),
    nodeData: JSON.stringify(nodes),
    thumbnail: '🧩',
    category: newCategory.value || 'Custom',
    createdAt: Date.now(),
  }

  components.value.push(comp)
  save()
  isNaming.value = false
}

function deleteComponent(id: string) {
  components.value = components.value.filter((c) => c.id !== id)
  save()
}

function renameComponent(id: string) {
  const comp = components.value.find((c) => c.id === id)
  if (!comp) return
  const name = prompt('Rename component:', comp.name)
  if (name?.trim()) {
    comp.name = name.trim()
    save()
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<template>
  <div data-test-id="component-library" class="flex min-h-0 flex-1 flex-col">
    <!-- Header -->
    <div class="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      <span class="text-xs font-semibold text-surface">Components</span>
      <span class="text-[11px] text-muted">{{ components.length }}</span>
      <div class="flex-1" />
      <button
        :disabled="store.state.selectedIds.size === 0"
        class="rounded bg-blue-600 px-2 py-0.5 text-[12px] text-white hover:bg-blue-500 disabled:opacity-40"
        @click="saveSelection"
      >
        + Save
      </button>
    </div>

    <!-- Save dialog -->
    <div v-if="isNaming" class="border-b border-border p-2">
      <input
        v-model="newName"
        type="text"
        placeholder="Component name..."
        class="mb-1.5 w-full rounded border border-border bg-transparent px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:border-blue-500 focus:outline-none"
        @keydown.enter="confirmSave"
      />
      <div class="flex gap-1.5">
        <input
          v-model="newCategory"
          type="text"
          placeholder="Category"
          class="flex-1 rounded border border-border bg-transparent px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:outline-none"
        />
        <button
          :disabled="!newName.trim()"
          class="rounded bg-blue-600 px-2 py-1 text-[12px] text-white hover:bg-blue-500 disabled:opacity-40"
          @click="confirmSave"
        >
          Save
        </button>
        <button
          class="rounded border border-border px-2 py-1 text-[12px] text-muted hover:bg-hover"
          @click="isNaming = false"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="shrink-0 border-b border-border px-3 py-1.5">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search components..."
        class="w-full rounded border border-border bg-transparent px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:border-blue-500 focus:outline-none"
      />
    </div>

    <!-- Category filter -->
    <div v-if="categories.length > 0" class="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-2 py-1">
      <button
        class="rounded px-1.5 py-0.5 text-[11px]"
        :class="!selectedCategory ? 'bg-hover text-surface' : 'text-muted hover:text-surface'"
        @click="selectedCategory = null"
      >
        All
      </button>
      <button
        v-for="cat in categories"
        :key="cat"
        class="rounded px-1.5 py-0.5 text-[11px]"
        :class="selectedCategory === cat ? 'bg-hover text-surface' : 'text-muted hover:text-surface'"
        @click="selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <ScrollAreaRoot class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <!-- Empty state -->
        <div v-if="filtered.length === 0" class="px-4 py-8 text-center">
          <span class="text-2xl">🧩</span>
          <p class="mt-2 text-[12px] text-muted">
            {{ components.length === 0 ? 'No saved components yet.' : 'No matches found.' }}
          </p>
          <p v-if="components.length === 0" class="mt-1 text-[11px] text-muted/70">
            Select elements on the canvas, then click + Save above.
          </p>
          <button
            v-if="components.length === 0 && store.state.selectedIds.size > 0"
            class="mt-3 rounded bg-blue-600 px-3 py-1 text-[12px] text-white hover:bg-blue-500"
            @click="saveSelection"
          >
            Save Selection as Component
          </button>
        </div>

        <!-- Component grid -->
        <div class="grid grid-cols-2 gap-1.5 p-2">
          <div
            v-for="c in filtered"
            :key="c.id"
            class="group rounded border border-border/50 p-2 hover:border-border"
            draggable="true"
            @dragstart="(e: DragEvent) => startDrag({ type: 'component', componentId: c.id, nodeData: c.nodeData }, e)"
            @dragend="endDrag"
          >
            <div class="mb-1 flex h-12 items-center justify-center rounded bg-inset text-xl">
              {{ c.thumbnail }}
            </div>
            <div class="truncate text-[12px] font-semibold text-surface">{{ c.name }}</div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-muted">{{ c.category }}</span>
              <div class="flex gap-1 opacity-0 group-hover:opacity-100">
                <button class="text-[11px] text-muted hover:text-surface" @click.stop="renameComponent(c.id)">✏️</button>
                <button class="text-[11px] text-red-400/60 hover:text-red-400" @click.stop="deleteComponent(c.id)">🗑</button>
              </div>
            </div>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>
  </div>
</template>
