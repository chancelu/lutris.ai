<script setup lang="ts">
import Prism from 'prismjs'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-css'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { computed, ref } from 'vue'

import { selectionToJSX, buildTailwindConfig } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'
import { useBrand } from '@/composables/use-brand'

import type { SceneNode } from '@open-pencil/core'

const store = useEditorStore()
const { config: brandConfig } = useBrand()
const activeSection = ref<'specs' | 'code' | 'tokens' | 'components' | 'systems'>('specs')
const codeFormat = ref<'tailwind' | 'css' | 'jsx'>('tailwind')
const copied = ref('')

// ── Helpers ──

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text)
  copied.value = label
  setTimeout(() => (copied.value = ''), 2000)
}

function colorToHex(fill: unknown): string {
  if (!fill) return '#000000'
  if (typeof fill === 'string') return fill
  if (Array.isArray(fill) && fill.length > 0) {
    const f = fill[0]
    if (typeof f === 'string') return f
    if (f?.color) return f.color
    if (f?.type === 'gradient') return '(gradient)'
  }
  return '#000000'
}

function px(v: unknown): string {
  if (typeof v === 'number') return `${Math.round(v)}px`
  return '0px'
}

// ── Selected node specs ──

const selectedNode = computed<SceneNode | null>(() => {
  void store.state.sceneVersion
  const ids = [...store.state.selectedIds]
  if (ids.length !== 1) return null
  return store.graph.getNode(ids[0]) ?? null
})

interface SpecItem {
  label: string
  value: string
  copyable: string
}

function specItem(label: string, value: string, copyable?: string): SpecItem {
  return { label, value, copyable: copyable ?? value }
}

function extractPositionSpecs(node: SceneNode): SpecItem[] {
  const abs = store.graph.getAbsolutePosition(node.id)
  return [
    specItem('X', px(abs?.x ?? node.x), String(Math.round(abs?.x ?? node.x ?? 0))),
    specItem('Y', px(abs?.y ?? node.y), String(Math.round(abs?.y ?? node.y ?? 0))),
    specItem('W', px(node.width), String(Math.round(node.width ?? 0))),
    specItem('H', px(node.height), String(Math.round(node.height ?? 0))),
  ]
}

function extractVisualSpecs(node: SceneNode): SpecItem[] {
  const items: SpecItem[] = []
  if (node.cornerRadius) items.push(specItem('Radius', px(node.cornerRadius), String(node.cornerRadius)))
  if (node.opacity !== undefined && node.opacity !== 1) items.push(specItem('Opacity', `${Math.round(node.opacity * 100)}%`, String(node.opacity)))
  if (node.rotation) items.push(specItem('Rotation', `${Math.round(node.rotation)}°`, String(node.rotation)))
  const fillHex = colorToHex(node.fill)
  if (fillHex !== '#000000') items.push(specItem('Fill', fillHex))
  if (node.stroke) items.push(specItem('Stroke', colorToHex(node.stroke)))
  if (node.strokeWeight) items.push(specItem('Stroke W', px(node.strokeWeight), String(node.strokeWeight)))
  return items
}

function extractTextSpecs(node: SceneNode): SpecItem[] {
  if (node.type !== 'text') return []
  const items: SpecItem[] = []
  if (node.fontSize) items.push(specItem('Font Size', px(node.fontSize), String(node.fontSize)))
  if (node.fontFamily) items.push(specItem('Font', node.fontFamily))
  if (node.fontWeight) items.push(specItem('Weight', String(node.fontWeight)))
  if (node.lineHeight) items.push(specItem('Line H', String(node.lineHeight)))
  if (node.letterSpacing) items.push(specItem('Letter Sp', String(node.letterSpacing)))
  return items
}

function extractLayoutSpecs(node: SceneNode): SpecItem[] {
  const items: SpecItem[] = []
  if (node.layoutMode) items.push(specItem('Layout', node.layoutMode))
  if (node.itemSpacing) items.push(specItem('Gap', px(node.itemSpacing), String(node.itemSpacing)))
  if (node.paddingTop || node.paddingRight || node.paddingBottom || node.paddingLeft) {
    const p = `${node.paddingTop ?? 0} ${node.paddingRight ?? 0} ${node.paddingBottom ?? 0} ${node.paddingLeft ?? 0}`
    items.push(specItem('Padding', p))
  }
  return items
}

const specs = computed<SpecItem[]>(() => {
  const node = selectedNode.value
  if (!node) return []
  return [
    ...extractPositionSpecs(node),
    ...extractVisualSpecs(node),
    ...extractTextSpecs(node),
    ...extractLayoutSpecs(node),
  ]
})

// ── Code export ──

const jsxCode = computed(() => {
  void store.state.sceneVersion
  const ids = [...store.state.selectedIds]
  if (ids.length === 0) return ''
  const format = codeFormat.value === 'css' ? 'tailwind' : 'openpencil'
  return selectionToJSX(ids, store.graph, format)
})

function cssBoxProps(node: SceneNode): string[] {
  const lines: string[] = []
  if (node.width) lines.push(`width: ${Math.round(node.width)}px;`)
  if (node.height) lines.push(`height: ${Math.round(node.height)}px;`)
  const fillHex = colorToHex(node.fill)
  if (fillHex !== '#000000') lines.push(`background: ${fillHex};`)
  if (node.cornerRadius) lines.push(`border-radius: ${node.cornerRadius}px;`)
  if (node.opacity !== undefined && node.opacity !== 1) lines.push(`opacity: ${node.opacity};`)
  if (node.stroke) lines.push(`border: ${node.strokeWeight ?? 1}px solid ${colorToHex(node.stroke)};`)
  return lines
}

function cssTextProps(node: SceneNode): string[] {
  if (node.type !== 'text') return []
  const lines: string[] = []
  if (node.fontSize) lines.push(`font-size: ${node.fontSize}px;`)
  if (node.fontFamily) lines.push(`font-family: "${node.fontFamily}";`)
  if (node.fontWeight) lines.push(`font-weight: ${node.fontWeight};`)
  if (node.lineHeight) lines.push(`line-height: ${node.lineHeight};`)
  return lines
}

function cssLayoutProps(node: SceneNode): string[] {
  const lines: string[] = []
  if (node.layoutMode) {
    lines.push('display: flex;')
    lines.push(`flex-direction: ${node.layoutMode === 'HORIZONTAL' ? 'row' : 'column'};`)
    if (node.itemSpacing) lines.push(`gap: ${node.itemSpacing}px;`)
  }
  if (node.paddingTop || node.paddingRight || node.paddingBottom || node.paddingLeft) {
    lines.push(`padding: ${node.paddingTop ?? 0}px ${node.paddingRight ?? 0}px ${node.paddingBottom ?? 0}px ${node.paddingLeft ?? 0}px;`)
  }
  return lines
}

const cssCode = computed(() => {
  const node = selectedNode.value
  if (!node) return ''
  return [...cssBoxProps(node), ...cssTextProps(node), ...cssLayoutProps(node)].join('\n')
})

const displayCode = computed(() => codeFormat.value === 'css' ? cssCode.value : jsxCode.value)
const codeLang = computed(() => codeFormat.value === 'css' ? 'css' : 'jsx')

const highlightedLines = computed(() => {
  if (!displayCode.value) return []
  const lang = codeLang.value
  const grammar = lang === 'css' ? Prism.languages.css : (Prism.languages.jsx ?? Prism.languages.javascript)
  return displayCode.value.split('\n').map((line) => Prism.highlight(line, grammar, lang))
})

// ── Design Tokens ──

const tokens = computed(() => {
  void store.state.sceneVersion
  const vars = store.graph.getVariables?.() ?? []
  return vars.map((v: { name: string; value: unknown; collection?: string }) => ({
    name: v.name,
    value: String(v.value),
    collection: v.collection ?? ''
  }))
})

function exportTokensCSS() {
  const lines = tokens.value.map((t: { name: string; value: string }) => `  --${t.name.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase()}: ${t.value};`)
  return `:root {\n${lines.join('\n')}\n}`
}

function exportTokensJSON() {
  const obj: Record<string, string> = {}
  tokens.value.forEach((t: { name: string; value: string }) => { obj[t.name] = t.value })
  return JSON.stringify(obj, null, 2)
}

function exportTokensTailwind() {
  const colorTokens = tokens.value
    .filter((t: { value: string }) => t.value.startsWith('#'))
    .map((t: { name: string; value: string }) => ({ name: t.name, hex: t.value, count: 1 }))
  return buildTailwindConfig({
    colors: colorTokens,
    typography: [],
    spacing: [],
    borderRadius: []
  })
}

// ── Design Systems Extraction ──

const allPageNodes = computed<SceneNode[]>(() => {
  void store.state.sceneVersion
  const pageId = store.state.currentPageId
  if (!pageId) return []
  const page = store.graph.nodes.get(pageId)
  if (!page?.children) return []
  const nodes: SceneNode[] = []
  function walk(ids: string[]) {
    for (const id of ids) {
      const n = store.graph.nodes.get(id)
      if (!n) continue
      nodes.push(n)
      if (n.children) walk(n.children)
    }
  }
  walk(page.children)
  return nodes
})

// Color system: extract all unique colors
const colorSystem = computed(() => {
  const colors = new Map<string, number>()
  for (const n of allPageNodes.value) {
    const fill = colorToHex(n.fill)
    if (fill && fill !== '#000000') colors.set(fill, (colors.get(fill) ?? 0) + 1)
    if (n.stroke) {
      const s = colorToHex(n.stroke)
      if (s) colors.set(s, (colors.get(s) ?? 0) + 1)
    }
  }
  return [...colors.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({ color, count }))
})

// Typography scale: extract font sizes and weights
const typographyScale = computed(() => {
  const sizes = new Map<string, number>()
  for (const n of allPageNodes.value) {
    if (n.type !== 'text' && n.type !== 'TEXT') continue
    const key = `${n.fontSize ?? 16}/${n.fontWeight ?? 400}/${n.fontFamily ?? 'default'}`
    sizes.set(key, (sizes.get(key) ?? 0) + 1)
  }
  return [...sizes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => {
      const [size, weight, family] = key.split('/')
      return { size: Number(size), weight: Number(weight), family, count }
    })
})

// Spacing system: extract consistent spacing values
const spacingSystem = computed(() => {
  const gaps = new Map<number, number>()
  for (const n of allPageNodes.value) {
    if (n.itemSpacing) gaps.set(n.itemSpacing, (gaps.get(n.itemSpacing) ?? 0) + 1)
    for (const p of [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft]) {
      if (p && p > 0) gaps.set(p, (gaps.get(p) ?? 0) + 1)
    }
  }
  return [...gaps.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([value, count]) => ({ value, count }))
})

// Component inventory: detect repeated patterns
const componentInventory = computed(() => {
  const types = new Map<string, { count: number; names: string[] }>()
  for (const n of allPageNodes.value) {
    if (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET' || n.type === 'INSTANCE') {
      const name = n.name || n.type
      const entry = types.get(name) ?? { count: 0, names: [] }
      entry.count++
      types.set(name, entry)
    }
  }
  return [...types.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, data]) => ({ name, count: data.count }))
})

// Requirement traceability for selected node (removed - use-requirements deleted)
const nodeRequirements = computed(() => {
  return []
})
</script>

<template>
  <div
    v-if="store.state.selectedIds.size === 0 && tokens.length === 0"
    data-test-id="handoff-panel-empty"
    class="flex flex-1 items-center justify-center px-4 text-center"
  >
    <span class="text-xs text-muted">Select a layer to see handoff specs</span>
  </div>

  <div v-else data-test-id="handoff-panel" class="flex min-h-0 flex-1 flex-col">
    <!-- Section tabs -->
    <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
      <button
        v-for="sec in (['specs', 'code', 'tokens', 'components', 'systems'] as const)"
        :key="sec"
        :data-test-id="`handoff-section-${sec}`"
        class="rounded px-2 py-0.5 text-[11px] capitalize"
        :class="activeSection === sec ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
        @click="activeSection = sec"
      >
        {{ sec === 'specs' ? 'Specs' : sec === 'code' ? 'Code' : sec === 'tokens' ? 'Tokens' : sec === 'components' ? 'Components' : 'Systems' }}
      </button>
    </div>

    <!-- Specs section -->
    <ScrollAreaRoot v-if="activeSection === 'specs'" class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="p-3">
          <div v-if="specs.length === 0" class="flex flex-col items-center gap-2 py-6 text-center">
            <icon-lucide-mouse-pointer class="size-5 text-muted/40" />
            <span class="text-xs text-muted">Select a single element to view specs</span>
          </div>
          <div v-for="item in specs" :key="item.label" class="flex items-center justify-between py-1 border-b border-border/50">
            <span class="text-[12px] text-muted w-20 shrink-0">{{ item.label }}</span>
            <span class="text-[12px] text-surface flex-1 text-right font-mono">{{ item.value }}</span>
            <button
              class="ml-2 shrink-0 rounded p-0.5 text-muted hover:text-surface hover:bg-hover"
              :title="`Copy ${item.label}`"
              @click="copyText(item.copyable, item.label)"
            >
              <icon-lucide-check v-if="copied === item.label" class="size-3 text-green-400" />
              <icon-lucide-copy v-else class="size-3" />
            </button>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <!-- Code section -->
    <div v-else-if="activeSection === 'code'" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5">
        <div class="flex items-center gap-1">
          <button
            v-for="fmt in (['tailwind', 'css', 'jsx'] as const)"
            :key="fmt"
            class="rounded px-1.5 py-0.5 text-[12px]"
            :class="codeFormat === fmt ? 'bg-hover text-surface font-semibold' : 'text-muted hover:text-surface'"
            @click="codeFormat = fmt"
          >
            {{ fmt === 'tailwind' ? 'Tailwind' : fmt === 'css' ? 'CSS' : 'JSX' }}
          </button>
        </div>
        <button
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] text-muted hover:bg-hover hover:text-surface"
          @click="copyText(displayCode, 'code')"
        >
          <icon-lucide-check v-if="copied === 'code'" class="size-3 text-green-400" />
          <icon-lucide-copy v-else class="size-3" />
          {{ copied === 'code' ? 'Copied' : 'Copy' }}
        </button>
      </div>
      <ScrollAreaRoot class="min-h-0 flex-1">
        <ScrollAreaViewport class="size-full">
          <div class="p-3">
            <div v-if="!displayCode" class="text-xs text-muted">Select a layer to see code</div>
            <div v-for="(html, i) in highlightedLines" :key="i" class="flex text-xs leading-5">
              <span class="mr-3 shrink-0 text-right text-muted/40 select-none" style="min-width: 1.5em">{{ i + 1 }}</span>
              <pre class="m-0 min-w-0 flex-1 break-words whitespace-pre-wrap"><code v-html="html" /></pre>
            </div>
          </div>
        </ScrollAreaViewport>
        <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
          <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
        </ScrollAreaScrollbar>
      </ScrollAreaRoot>
    </div>

    <!-- Tokens section -->
    <ScrollAreaRoot v-else-if="activeSection === 'tokens'" class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="p-3">
          <div v-if="tokens.length === 0" class="text-xs text-muted">No design tokens found. Add variables to see them here.</div>
          <div v-else>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[12px] font-semibold text-surface">{{ tokens.length }} tokens</span>
              <div class="flex gap-1">
                <button
                  class="rounded px-1.5 py-0.5 text-[12px] text-muted hover:bg-hover hover:text-surface"
                  @click="copyText(exportTokensCSS(), 'css-vars')"
                >
                  {{ copied === 'css-vars' ? '✅ CSS' : 'CSS Vars' }}
                </button>
                <button
                  class="rounded px-1.5 py-0.5 text-[12px] text-muted hover:bg-hover hover:text-surface"
                  @click="copyText(exportTokensJSON(), 'json')"
                >
                  {{ copied === 'json' ? '✅ JSON' : 'JSON' }}
                </button>
                <button
                  class="rounded px-1.5 py-0.5 text-[12px] text-muted hover:bg-hover hover:text-surface"
                  @click="copyText(exportTokensTailwind(), 'tailwind')"
                >
                  {{ copied === 'tailwind' ? '✅ Tailwind' : 'Tailwind' }}
                </button>
              </div>
            </div>
            <div v-for="t in tokens" :key="t.name" class="flex items-center justify-between py-1 border-b border-border/50">
              <div class="flex flex-col">
                <span class="text-[12px] text-surface font-mono">{{ t.name }}</span>
                <span v-if="t.collection" class="text-[11px] text-muted">{{ t.collection }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div
                  v-if="t.value.startsWith('#')"
                  class="size-3 rounded-sm border border-white/20"
                  :style="{ background: t.value }"
                />
                <span class="text-[12px] text-muted font-mono">{{ t.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <!-- Components section -->
    <ScrollAreaRoot v-else-if="activeSection === 'components'" class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="p-3">
          <div v-if="componentInventory.length === 0" class="text-xs text-muted">No components detected. Create components to see inventory.</div>
          <div v-else>
            <div class="mb-2 text-[12px] font-semibold text-surface">{{ componentInventory.length }} components</div>
            <div v-for="comp in componentInventory" :key="comp.name" class="flex items-center justify-between py-1.5 border-b border-border/50">
              <span class="text-[12px] text-surface">{{ comp.name }}</span>
              <span class="text-[11px] text-muted">×{{ comp.count }}</span>
            </div>
          </div>
          <!-- Requirement traceability -->
          <div v-if="nodeRequirements.length > 0" class="mt-4 border-t border-border pt-3">
            <div class="mb-1 text-[11px] font-semibold text-muted uppercase tracking-wider">Requirements</div>
            <div v-for="req in nodeRequirements" :key="req.id" class="flex items-center gap-1.5 py-1">
              <span class="shrink-0 rounded px-1 text-[9px] font-bold" :class="req.priority === 'P0' ? 'bg-red-500/20 text-red-400' : req.priority === 'P1' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'">{{ req.priority }}</span>
              <span class="text-[11px] text-surface truncate">{{ req.title }}</span>
            </div>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <!-- Design Systems section -->
    <ScrollAreaRoot v-else-if="activeSection === 'systems'" class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="p-3 space-y-4">
          <!-- Color palette -->
          <div>
            <div class="mb-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">Colors ({{ colorSystem.length }})</div>
            <div class="flex flex-wrap gap-1.5">
              <div
                v-for="c in colorSystem.slice(0, 20)"
                :key="c.color"
                class="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 cursor-pointer hover:bg-hover"
                @click="copyText(c.color, c.color)"
              >
                <div class="size-3 rounded-sm border border-white/20" :style="{ background: c.color }" />
                <span class="text-[10px] font-mono text-muted">{{ c.color }}</span>
                <span class="text-[9px] text-muted/60">×{{ c.count }}</span>
              </div>
            </div>
          </div>
          <!-- Typography scale -->
          <div>
            <div class="mb-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">Typography ({{ typographyScale.length }})</div>
            <div v-for="t in typographyScale.slice(0, 10)" :key="`${t.size}-${t.weight}-${t.family}`" class="flex items-center justify-between py-1 border-b border-border/50">
              <div class="flex items-center gap-2">
                <span class="text-[12px] font-mono text-surface">{{ t.size }}px</span>
                <span class="text-[11px] text-muted">w{{ t.weight }}</span>
                <span class="text-[10px] text-muted/60">{{ t.family }}</span>
              </div>
              <span class="text-[10px] text-muted">×{{ t.count }}</span>
            </div>
          </div>
          <!-- Spacing scale -->
          <div>
            <div class="mb-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">Spacing ({{ spacingSystem.length }})</div>
            <div class="flex flex-wrap gap-1">
              <div
                v-for="s in spacingSystem"
                :key="s.value"
                class="rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted cursor-pointer hover:bg-hover"
                @click="copyText(String(s.value), `sp-${s.value}`)"
              >
                {{ s.value }}px <span class="text-muted/50">×{{ s.count }}</span>
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

<style>
.token.tag { color: #7dd3fc; }
.token.attr-name { color: #c4b5fd; }
.token.attr-value, .token.string { color: #86efac; }
.token.number { color: #fca5a5; }
.token.punctuation { color: #888; }
.token.property { color: #7dd3fc; }
.token.selector { color: #c4b5fd; }
</style>
