<script setup lang="ts">
import { computed, ref } from 'vue'

import ProductDocPanel from './ProductDocPanel.vue'
import { useSpec } from '@/composables/use-spec'

const { requirementsBoard, requirements, summary } = useSpec()
const showRequirements = ref(false)

const requirementCoverage = computed(() => {
  const reqs = requirements.value
  if (reqs.length === 0) return { total: 0, linked: 0, percentage: 0 }
  const linked = reqs.filter((req) => req.linkedNodeIds.length > 0).length
  return {
    total: reqs.length,
    linked,
    percentage: Math.round((linked / reqs.length) * 100),
  }
})

const personasLabel = computed(() => `${requirementsBoard.value.personas.length} personas`)
const metricsLabel = computed(() => `${requirementsBoard.value.successMetrics.length} metrics`)
const scopeLabel = computed(() => `${requirementsBoard.value.outOfScope.length} out-of-scope items`)
const summaryPreview = computed(() => {
  const text = summary.value.replace(/[#*_`>-]/g, '').trim()
  if (!text) return 'No spec summary yet. Import a PRD or save AI output into spec.'
  return text.slice(0, 180) + (text.length > 180 ? '…' : '')
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden select-text">
    <div class="border-b border-border px-3 py-3">
      <div class="rounded-2xl border border-border bg-inset/60 p-3">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div class="min-w-0">
            <div class="text-[12px] font-semibold text-surface">Spec Summary</div>
            <div class="mt-1 text-[11px] leading-5 text-muted">{{ summaryPreview }}</div>
          </div>
          <button
            class="shrink-0 self-start rounded-full border border-border px-2.5 py-1 text-[11px] text-muted transition hover:bg-hover hover:text-surface"
            @click="showRequirements = !showRequirements"
          >
            {{ showRequirements ? 'Hide requirements' : 'Open requirements' }}
          </button>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2">
          <div class="rounded-xl border border-border/70 bg-panel px-2.5 py-2">
            <div class="text-[10px] uppercase tracking-[0.18em] text-muted">Coverage</div>
            <div class="mt-1 text-[13px] font-semibold text-surface">{{ requirementCoverage.percentage }}%</div>
            <div class="text-[10px] text-muted">{{ requirementCoverage.linked }}/{{ requirementCoverage.total || 0 }} linked</div>
          </div>
          <div class="rounded-xl border border-border/70 bg-panel px-2.5 py-2">
            <div class="text-[10px] uppercase tracking-[0.18em] text-muted">Structure</div>
            <div class="mt-1 text-[13px] font-semibold text-surface">{{ personasLabel }}</div>
            <div class="text-[10px] text-muted">{{ metricsLabel }}</div>
          </div>
          <div class="rounded-xl border border-border/70 bg-panel px-2.5 py-2">
            <div class="text-[10px] uppercase tracking-[0.18em] text-muted">Scope</div>
            <div class="mt-1 text-[13px] font-semibold text-surface">{{ requirements.length }}</div>
            <div class="text-[10px] text-muted">reqs · {{ scopeLabel }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden border-b border-border">
      <div class="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <div class="text-[12px] font-semibold text-surface">Summary</div>
          <div class="text-[10px] text-muted">Narrative spec and product context</div>
        </div>
      </div>
      <ProductDocPanel default-section="summary" class="min-h-0 flex-1" />
    </div>

    <div v-if="showRequirements" class="min-h-[240px] border-t border-border">
      <div class="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <div class="text-[12px] font-semibold text-surface">Requirements</div>
          <div class="text-[10px] text-muted">Structured requirements and delivery status</div>
        </div>
      </div>
      <div class="h-[320px]">
        <div class="flex h-full items-center justify-center text-[12px] text-muted">Requirements board removed</div>
      </div>
    </div>
  </div>
</template>
