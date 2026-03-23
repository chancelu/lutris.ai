<script setup lang="ts">
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { computed, ref } from 'vue'

import { useEditorStore } from '@/stores/editor'
import { buildTailwindConfig } from '@open-pencil/core'
import { useAssetLibrary } from '@/composables/use-asset-library'

import type { SceneNode } from '@open-pencil/core'

const store = useEditorStore()
const { libraries, activeLibrary, loadLibrary, removeLibrary, setActiveLibrary } = useAssetLibrary()
const activeSection = ref<'components' | 'colors' | 'typography' | 'spacing'>('components')
const assetSource = ref<'local' | 'library'>('local')
const copied = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const loadingLibrary = ref(false)

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text)
  copied.value = label
  setTimeout(() => (copied.value = ''), 2000)
}

// ── Components ──

interface ComponentInfo {
  id: string
  name: string
  type: string
  page: string
}

const components = computed<ComponentInfo[]>(() => {
  void store.state.sceneVersion
  const result: ComponentInfo[] = []
  for (const node of store.graph.getAllNodes()) {
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      result.push({ id: node.id, name: node.name, type: node.type, page: '' })
    }
  }
  return result
})

// ── Colors ──

interface ColorInfo {
  hex: string
  count: number
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

const colors = computed<ColorInfo[]>(() => {
  void store.state.sceneVersion
  const colorMap = new Map<string, ColorInfo>()
  for (const node of store.graph.getAllNodes()) {
    if (node.type === 'CANVAS') continue
    // Extract from fills
    if (node.fills) {
      for (const fill of node.fills) {
        if (fill.type !== 'SOLID' || !fill.color) continue
        const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b)
        const existing = colorMap.get(hex)
        if (existing) { existing.count++ } else { colorMap.set(hex, { hex, count: 1 }) }
      }
    }
    // Extract from strokes
    if (node.strokes) {
      for (const stroke of node.strokes) {
        if (!stroke.color) continue
        const hex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b)
        const existing = colorMap.get(hex)
        if (existing) { existing.count++ } else { colorMap.set(hex, { hex, count: 1 }) }
      }
    }
  }
  return [...colorMap.values()].sort((a, b) => b.count - a.count)
})

// ── Typography ──

interface TypoStyle {
  family: string
  size: number
  weight: number
  lineHeight: string
  count: number
  key: string
}

const typography = computed<TypoStyle[]>(() => {
  void store.state.sceneVersion
  const styleMap = new Map<string, TypoStyle>()
  for (const node of store.graph.getAllNodes()) {
    if (node.type !== 'TEXT') continue
    const lh = node.lineHeight == null ? 'auto' : `${node.lineHeight}px`
    const key = `${node.fontFamily}|${node.fontSize}|${node.fontWeight}|${lh}`
    const existing = styleMap.get(key)
    if (existing) { existing.count++ } else {
      styleMap.set(key, {
        family: node.fontFamily ?? 'Unknown',
        size: node.fontSize ?? 16,
        weight: node.fontWeight ?? 400,
        lineHeight: lh,
        count: 1,
        key,
      })
    }
  }
  return [...styleMap.values()].sort((a, b) => b.count - a.count)
})

// ── Variables / Tokens ──

const variables = computed(() => {
  void store.state.sceneVersion
  try {
    const allVars: { id: string; name: string; type: string; collectionName: string }[] = []
    for (const [, col] of store.graph.variableCollections) {
      const vars = store.graph.getVariablesForCollection(col.id) ?? []
      for (const v of vars) {
        allVars.push({ id: v.id, name: v.name, type: v.resolvedType ?? 'unknown', collectionName: col.name })
      }
    }
    return allVars
  } catch { return [] }
})

const collections = computed(() => {
  void store.state.sceneVersion
  try {
    return [...store.graph.variableCollections.values()].map(col => ({
      ...col,
      varCount: (store.graph.getVariablesForCollection(col.id) ?? []).length,
    }))
  } catch { return [] }
})

// ── Summary ──

const summary = computed(() => ({
  components: components.value.length,
  colors: colors.value.length,
  typography: typography.value.length,
  variables: variables.value.length,
  collections: collections.value.length,
}))

// ── Export Tokens ──

const showExportMenu = ref(false)

function buildTokensJSON() {
  return JSON.stringify({
    colors: Object.fromEntries(colors.value.map((c, i) => [`color-${i + 1}`, { value: c.hex, count: c.count }])),
    typography: typography.value.map(t => ({
      family: t.family, size: t.size, weight: t.weight, lineHeight: t.lineHeight, count: t.count,
    })),
    components: components.value.map(c => ({ name: c.name, type: c.type })),
  }, null, 2)
}

function buildTokensCSS() {
  const lines = [':root {']
  colors.value.forEach((c, i) => lines.push(`  --color-${i + 1}: ${c.hex};`))
  typography.value.forEach((t, i) => {
    lines.push(`  --font-${i + 1}-family: ${t.family};`)
    lines.push(`  --font-${i + 1}-size: ${t.size}px;`)
    lines.push(`  --font-${i + 1}-weight: ${t.weight};`)
    lines.push(`  --font-${i + 1}-line-height: ${t.lineHeight};`)
  })
  lines.push('}')
  return lines.join('\n')
}

function buildTokensTailwind() {
  const familyMap = new Map<string, Set<number>>()
  for (const t of typography.value) {
    const sizes = familyMap.get(t.family) ?? new Set<number>()
    sizes.add(t.size)
    familyMap.set(t.family, sizes)
  }
  return buildTailwindConfig({
    colors: colors.value.map((c, i) => ({ name: `color-${i + 1}`, hex: c.hex, count: c.count })),
    typography: [...familyMap.entries()].map(([family, sizes]) => ({ family, sizes: [...sizes].sort((a, b) => a - b) })),
    spacing: [],
    borderRadius: []
  })
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  showExportMenu.value = false
}

function exportJSON() {
  downloadFile(buildTokensJSON(), 'design-tokens.json', 'application/json')
}

function exportCSS() {
  downloadFile(buildTokensCSS(), 'design-tokens.css', 'text/css')
}

function copyTokensJSON() {
  copyText(buildTokensJSON(), 'export-json')
  showExportMenu.value = false
}

function copyTokensCSS() {
  copyText(buildTokensCSS(), 'export-css')
  showExportMenu.value = false
}

function exportTailwind() {
  downloadFile(buildTokensTailwind(), 'tailwind.config.js', 'text/javascript')
}

function copyTokensTailwind() {
  copyText(buildTokensTailwind(), 'export-tailwind')
  showExportMenu.value = false
}

async function handleLibraryUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  loadingLibrary.value = true
  try {
    await loadLibrary(file)
    assetSource.value = 'library'
  } finally {
    loadingLibrary.value = false
    input.value = ''
  }
}
</script>

<template>
  <aside
    data-test-id="assets-panel"
    class="flex min-w-0 flex-1 flex-col overflow-hidden"
  >
    <!-- Source toggle: Local / External Library -->
    <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1">
      <button
        class="rounded px-2 py-0.5 text-[11px]"
        :class="assetSource === 'local' ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
        @click="assetSource = 'local'"
      >
        Local
      </button>
      <button
        class="rounded px-2 py-0.5 text-[11px]"
        :class="assetSource === 'library' ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
        @click="assetSource = 'library'"
      >
        Libraries ({{ libraries.length }})
      </button>
      <button
        class="ml-auto rounded p-0.5 text-muted hover:bg-hover hover:text-surface"
        title="Load .fig as library"
        @click="fileInput?.click()"
      >
        <icon-lucide-plus class="size-3.5" />
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".fig"
        class="hidden"
        @change="handleLibraryUpload"
      />
    </div>

    <!-- External library view -->
    <template v-if="assetSource === 'library'">
      <div v-if="libraries.length === 0" class="flex flex-1 items-center justify-center p-4">
        <div class="text-center">
          <p class="text-xs text-muted mb-2">No external libraries loaded</p>
          <button
            class="rounded bg-hover px-3 py-1 text-[12px] text-surface hover:bg-border"
            @click="fileInput?.click()"
          >
            Load .fig file
          </button>
        </div>
      </div>
      <template v-else>
        <!-- Library selector -->
        <div v-if="libraries.length > 1" class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1">
          <button
            v-for="lib in libraries"
            :key="lib.id"
            class="rounded px-2 py-0.5 text-[11px] truncate max-w-[120px]"
            :class="activeLibrary?.id === lib.id ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
            @click="setActiveLibrary(lib.id)"
            :title="lib.name"
          >
            {{ lib.name }}
          </button>
        </div>

        <!-- Library content -->
        <ScrollAreaRoot v-if="activeLibrary" class="min-h-0 flex-1">
          <ScrollAreaViewport class="size-full">
            <div class="p-3">
              <!-- Library header -->
              <div class="flex items-center justify-between mb-3">
                <span class="text-[12px] font-semibold text-surface truncate">{{ activeLibrary.name }}</span>
                <button
                  class="shrink-0 rounded p-0.5 text-muted hover:text-red-400 hover:bg-hover"
                  title="Remove library"
                  @click="removeLibrary(activeLibrary.id)"
                >
                  <icon-lucide-x class="size-3" />
                </button>
              </div>

              <!-- Library summary -->
              <div class="flex gap-3 mb-3 text-[11px] text-muted">
                <span>{{ activeLibrary.components.length }} components</span>
                <span>{{ activeLibrary.colors.length }} colors</span>
                <span>{{ activeLibrary.typography.length }} styles</span>
              </div>

              <!-- Library components -->
              <div v-if="activeLibrary.components.length > 0" class="mb-3">
                <span class="text-[11px] font-semibold text-muted uppercase tracking-wider">Components</span>
                <div
                  v-for="comp in activeLibrary.components"
                  :key="comp.id"
                  class="flex items-center gap-2 py-1.5 border-b border-border/50 cursor-grab"
                  draggable="true"
                  @dragstart="$event.dataTransfer?.setData('application/designflow-component', JSON.stringify({ type: 'component', componentId: comp.id, nodeData: comp.nodeData }))"
                >
                  <icon-lucide-component class="size-3 text-muted shrink-0" />
                  <span class="text-[12px] text-surface truncate">{{ comp.name }}</span>
                  <span class="text-[11px] text-muted ml-auto">{{ comp.type === 'COMPONENT_SET' ? 'Set' : 'Comp' }}</span>
                </div>
              </div>

              <!-- Library colors -->
              <div v-if="activeLibrary.colors.length > 0" class="mb-3">
                <span class="text-[11px] font-semibold text-muted uppercase tracking-wider">Colors</span>
                <div class="flex flex-wrap gap-1 mt-1">
                  <button
                    v-for="c in activeLibrary.colors.slice(0, 24)"
                    :key="c.hex"
                    class="size-6 rounded-sm border border-white/20"
                    :style="{ background: c.hex }"
                    :title="`${c.hex} (×${c.count})`"
                    @click="copyText(c.hex, c.hex)"
                  />
                </div>
              </div>

              <!-- Library typography -->
              <div v-if="activeLibrary.typography.length > 0">
                <span class="text-[11px] font-semibold text-muted uppercase tracking-wider">Typography</span>
                <div v-for="t in activeLibrary.typography" :key="`${t.family}-${t.size}-${t.weight}`" class="py-1 border-b border-border/50">
                  <span class="text-[12px] text-surface">{{ t.family }}</span>
                  <span class="text-[11px] text-muted ml-1">{{ t.size }}px w{{ t.weight }} ×{{ t.count }}</span>
                </div>
              </div>
            </div>
          </ScrollAreaViewport>
          <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
            <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
          </ScrollAreaScrollbar>
        </ScrollAreaRoot>
      </template>
    </template>

    <!-- Loading overlay -->
    <div v-if="loadingLibrary" class="absolute inset-0 z-50 flex items-center justify-center bg-panel/80">
      <span class="text-xs text-muted">Loading library...</span>
    </div>

    <!-- LOCAL ASSETS (existing content) -->
    <template v-if="assetSource === 'local'">
    <!-- Summary bar -->
    <div class="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      <span class="text-[12px] font-semibold text-surface">Design System</span>
      <span class="ml-auto text-[11px] text-muted">
        {{ summary.components }}C · {{ summary.colors }}🎨 · {{ summary.typography }}T · {{ summary.variables }}V
      </span>
      <div class="relative">
        <button
          class="rounded p-0.5 text-muted hover:bg-hover hover:text-surface"
          title="Export tokens"
          @click="showExportMenu = !showExportMenu"
        >
          <icon-lucide-download class="size-3.5" />
        </button>
        <div
          v-if="showExportMenu"
          class="absolute right-0 top-full z-50 mt-1 w-40 rounded-md border border-border bg-panel py-1 shadow-lg"
        >
          <button class="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-surface hover:bg-hover" @click="exportJSON()">
            📄 Download JSON
          </button>
          <button class="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-surface hover:bg-hover" @click="exportCSS()">
            🎨 Download CSS
          </button>
          <button class="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-surface hover:bg-hover" @click="exportTailwind()">
            🌊 Download Tailwind
          </button>
          <div class="my-1 border-t border-border" />
          <button class="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-surface hover:bg-hover" @click="copyTokensJSON()">
            {{ copied === 'export-json' ? '✅ Copied' : '📋 Copy JSON' }}
          </button>
          <button class="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-surface hover:bg-hover" @click="copyTokensCSS()">
            {{ copied === 'export-css' ? '✅ Copied' : '📋 Copy CSS' }}
          </button>
          <button class="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-surface hover:bg-hover" @click="copyTokensTailwind()">
            {{ copied === 'export-tailwind' ? '✅ Copied' : '📋 Copy Tailwind' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Section tabs -->
    <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
      <button
        v-for="sec in (['components', 'colors', 'typography', 'spacing'] as const)"
        :key="sec"
        :data-test-id="`assets-section-${sec}`"
        class="rounded px-2 py-0.5 text-[12px] capitalize"
        :class="activeSection === sec ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
        @click="activeSection = sec"
      >
        {{ sec === 'components' ? '🧩 Components' : sec === 'colors' ? '🎨 Colors' : sec === 'typography' ? '📝 Type' : '📐 Spacing' }}
      </button>
    </div>

    <!-- Components section -->
    <ScrollAreaRoot v-if="activeSection === 'components'" class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="p-3">
          <div v-if="components.length === 0" class="text-xs text-muted">
            No components found. Open a .fig file with components to see them here.
          </div>
          <div v-for="comp in components" :key="comp.id" class="flex items-center justify-between py-1.5 border-b border-border/50">
            <div class="flex flex-col min-w-0">
              <span class="text-[12px] text-surface truncate">{{ comp.name }}</span>
              <span class="text-[11px] text-muted">{{ comp.type === 'COMPONENT_SET' ? 'Set' : 'Component' }} · {{ comp.page }}</span>
            </div>
            <button
              class="ml-2 shrink-0 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
              title="Select in canvas"
              @click="store.state.selectedIds = new Set([comp.id])"
            >
              <icon-lucide-locate class="size-3" />
            </button>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <!-- Colors section -->
    <ScrollAreaRoot v-else-if="activeSection === 'colors'" class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="p-3">
          <div v-if="colors.length === 0" class="text-xs text-muted">
            No colors found. Open a .fig file to analyze its color palette.
          </div>
          <div class="flex items-center justify-between mb-2" v-if="colors.length > 0">
            <span class="text-[12px] font-semibold text-surface">{{ colors.length }} colors</span>
            <button
              class="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
              @click="copyText(colors.map(c => c.hex).join('\n'), 'all-colors')"
            >
              {{ copied === 'all-colors' ? '✅ Copied' : 'Copy all' }}
            </button>
          </div>
          <div v-for="c in colors" :key="c.hex" class="flex items-center gap-2 py-1 border-b border-border/50">
            <div
              class="size-5 rounded-sm border border-white/20 shrink-0"
              :style="{ background: c.hex }"
            />
            <span class="text-[12px] text-surface font-mono flex-1">{{ c.hex }}</span>
            <span class="text-[11px] text-muted">×{{ c.count }}</span>
            <button
              class="shrink-0 rounded p-0.5 text-muted hover:text-surface hover:bg-hover"
              @click="copyText(c.hex, c.hex)"
            >
              <icon-lucide-check v-if="copied === c.hex" class="size-3 text-green-400" />
              <icon-lucide-copy v-else class="size-3" />
            </button>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <!-- Typography section -->
    <ScrollAreaRoot v-else-if="activeSection === 'typography'" class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="p-3">
          <div v-if="typography.length === 0" class="text-xs text-muted">
            No text styles found. Open a .fig file to analyze typography.
          </div>
          <div v-for="t in typography" :key="t.key" class="py-2 border-b border-border/50">
            <div class="flex items-center justify-between">
              <span class="text-[12px] text-surface font-semibold">{{ t.family }}</span>
              <span class="text-[11px] text-muted">×{{ t.count }}</span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[11px] text-muted">{{ t.size }}px</span>
              <span class="text-[11px] text-muted">w{{ t.weight }}</span>
              <span class="text-[11px] text-muted">lh: {{ t.lineHeight }}</span>
            </div>
            <div class="mt-1">
              <span
                class="text-muted"
                :style="{ fontFamily: t.family, fontSize: `${Math.min(t.size, 18)}px`, fontWeight: t.weight }"
              >
                The quick brown fox
              </span>
            </div>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <!-- Spacing section (variables + collections) -->
    <ScrollAreaRoot v-else-if="activeSection === 'spacing'" class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="p-3">
          <div v-if="variables.length === 0 && collections.length === 0" class="text-xs text-muted">
            No design tokens found. Open a .fig file with variables to see them here.
          </div>

          <!-- Collections -->
          <div v-if="collections.length > 0" class="mb-3">
            <span class="text-[12px] font-semibold text-surface">Collections ({{ collections.length }})</span>
            <div v-for="col in collections" :key="col.id" class="flex items-center gap-2 py-1 border-b border-border/50 mt-1">
              <icon-lucide-folder class="size-3 text-muted shrink-0" />
              <span class="text-[12px] text-surface">{{ col.name }}</span>
              <span class="text-[11px] text-muted ml-auto">{{ col.varCount }} vars · {{ col.modes?.length ?? 0 }} modes</span>
            </div>
          </div>

          <!-- Variables -->
          <div v-if="variables.length > 0">
            <span class="text-[12px] font-semibold text-surface">Variables ({{ variables.length }})</span>
            <div v-for="v in variables" :key="v.id" class="flex items-center justify-between py-1 border-b border-border/50 mt-1">
              <div class="flex flex-col min-w-0">
                <span class="text-[12px] text-surface font-mono truncate">{{ v.name }}</span>
                <span class="text-[11px] text-muted">{{ v.type }}</span>
              </div>
              <button
                class="shrink-0 rounded p-0.5 text-muted hover:text-surface hover:bg-hover"
                @click="copyText(v.name, v.id)"
              >
                <icon-lucide-check v-if="copied === v.id" class="size-3 text-green-400" />
                <icon-lucide-copy v-else class="size-3" />
              </button>
            </div>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>
    </template>
  </aside>
</template>
