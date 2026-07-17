<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useEditorStore } from '@/stores/editor'
import NextStepCard from './NextStepCard.vue'

const store = useEditorStore()
const format = ref<'PNG' | 'JPG' | 'SVG' | 'WEBP' | 'PDF'>('PNG')
const scale = ref(2)
const isExporting = ref(false)
const exportSuccess = ref<string | null>(null)
const filename = ref(store.selectedNode?.name || store.state.documentName || 'Export')

watchEffect(() => {
  const name = store.selectedNode?.name
  if (name) filename.value = name
})

const FORMATS = [
  { value: 'PNG', label: 'PNG', desc: 'Lossless, transparent background' },
  { value: 'JPG', label: 'JPG', desc: 'Compressed, smaller file size' },
  { value: 'SVG', label: 'SVG', desc: 'Vector, scalable' },
  { value: 'WEBP', label: 'WebP', desc: 'Modern format, best compression' },
  { value: 'PDF', label: 'PDF', desc: 'Print-ready document' },
] as const

const SCALES = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 4, label: '4x' },
]

const hasSelection = computed(() => store.state.selectedIds.size > 0)
// Dead measurementMode toggles removed (Slice B) — phase CTAs belong to NextStepCard.

async function handleExport() {
  isExporting.value = true
  exportSuccess.value = null
  try {
    const baseName = filename.value.trim() || 'Export'
    if (format.value === 'PDF') {
      await exportAsPDF()
    } else {
      await store.exportSelection(scale.value, format.value, baseName)
    }
    exportSuccess.value = `Exported as ${format.value} @ ${scale.value}x`
    setTimeout(() => { exportSuccess.value = null }, 3000)
  } catch (e) {
    console.error('Export failed:', e)
  } finally {
    isExporting.value = false
  }
}

async function exportAsPDF() {
  const ids = [...store.state.selectedIds]
  const data = await store.renderExportImage(
    ids.length > 0 ? ids : [],
    scale.value,
    'PNG'
  )
  if (!data) throw new Error('Failed to render image for PDF')

  const { jsPDF } = await import('jspdf')

  const base64 = btoa(
    Array.from(new Uint8Array(data))
      .map((b) => String.fromCharCode(b))
      .join('')
  )

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = `data:image/png;base64,${base64}`
  })

  const orientation = img.width > img.height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [img.width, img.height],
  })

  pdf.addImage(`data:image/png;base64,${base64}`, 'PNG', 0, 0, img.width, img.height)
  pdf.save(`${filename.value || 'Export'}.pdf`)
}
</script>

<template>
  <div class="select-text p-3">
    <div class="mb-3">
      <div class="text-xs font-semibold text-surface">Export</div>
      <div class="mt-1 text-[11px] leading-5 text-muted">Start with the deliverable. Code and handoff stay available, but secondary.</div>
    </div>

    <div class="mb-3 rounded-xl border border-border/30 bg-canvas/40 p-3">
      <div class="mb-1 text-[12px] text-muted">Filename</div>
      <input
        v-model="filename"
        type="text"
        placeholder="Export"
        class="w-full rounded-lg border border-border/30 bg-transparent px-3 py-2 text-[13px] text-surface placeholder:text-muted/50 focus:border-blue-500 focus:outline-none"
      />
    </div>

    <div class="mb-3 rounded-xl border border-border/30 bg-canvas/40 p-3">
      <div class="mb-1 text-[12px] text-muted">Format</div>
      <div class="grid grid-cols-5 gap-1">
        <button
          v-for="f in FORMATS"
          :key="f.value"
          class="rounded-xl border py-2 text-center text-[12px] transition-colors"
          :class="format === f.value
            ? 'border-blue-500 bg-blue-500/10 text-surface font-semibold'
            : 'border-border/30 text-muted hover:text-surface'"
          @click="format = f.value"
        >
          {{ f.label }}
        </button>
      </div>
      <div class="mt-1 text-[11px] text-muted/70">
        {{ FORMATS.find(f => f.value === format)?.desc }}
      </div>
    </div>

    <div v-if="format !== 'SVG'" class="mb-3 rounded-xl border border-border/30 bg-canvas/40 p-3">
      <div class="mb-1 text-[12px] text-muted">Scale</div>
      <div class="flex gap-1">
        <button
          v-for="s in SCALES"
          :key="s.value"
          class="rounded-full border px-2.5 py-1 text-[12px] transition-colors"
          :class="scale === s.value
            ? 'border-blue-500 bg-blue-500/10 text-surface font-semibold'
            : 'border-border/30 text-muted hover:text-surface'"
          @click="scale = s.value"
        >
          {{ s.label }}
        </button>
      </div>
    </div>

    <div class="mb-3 flex items-center justify-center rounded-xl border border-border/30 bg-canvas/40 p-4">
      <div class="flex flex-col items-center gap-2">
        <div class="flex size-16 items-center justify-center rounded-xl bg-panel text-muted">
          <icon-lucide-image v-if="format === 'PNG' || format === 'JPG' || format === 'WEBP'" class="size-8 opacity-40" />
          <icon-lucide-file-code v-else-if="format === 'SVG'" class="size-8 opacity-40" />
          <icon-lucide-file-text v-else class="size-8 opacity-40" />
        </div>
        <div class="text-[11px] text-muted">
          {{ filename || 'Export' }}.{{ format.toLowerCase() }}
          <span v-if="format !== 'SVG'" class="text-muted/50">@ {{ scale }}x</span>
        </div>
        <div class="text-[11px] text-muted/70">
          {{ hasSelection ? `${store.state.selectedIds.size} selected` : 'No selection (exports full page)' }}
        </div>
      </div>
    </div>

    <button
      :disabled="isExporting"
      class="w-full rounded-xl bg-blue-600 py-2 text-xs text-white hover:bg-blue-500 disabled:opacity-40"
      @click="handleExport"
    >
      {{ isExporting ? 'Exporting...' : `Export as ${format}` }}
    </button>

    <div v-if="exportSuccess" class="mt-2 rounded-lg border border-green-500/20 bg-green-500/8 px-3 py-1.5 text-center">
      <span class="text-[11px] text-green-400">{{ exportSuccess }}</span>
    </div>

    <div v-if="exportSuccess" class="mt-2">
      <NextStepCard />
    </div>
  </div>
</template>
