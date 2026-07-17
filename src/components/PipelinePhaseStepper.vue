<script setup lang="ts">
import { usePipeline } from '@/composables/use-pipeline'
import { PIPELINE_PHASES } from '@/types/pipeline'
import type { PipelinePhase } from '@/types/pipeline'

const PHASE_LABELS: Record<PipelinePhase, string> = {
  idea: 'Idea',
  spec: 'Spec',
  design: 'Design',
  dev: 'Dev',
}

const { currentPhase, phases, canJumpTo, jumpToPhase } = usePipeline()

function onPhaseClick(phase: PipelinePhase) {
  if (canJumpTo(phase)) jumpToPhase(phase)
}
</script>

<template>
  <div class="flex items-center gap-0.5" data-test-id="pipeline-phase-stepper">
    <template v-for="(phase, i) in PIPELINE_PHASES" :key="phase">
      <button
        type="button"
        class="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition"
        :class="[
          phase === currentPhase
            ? 'bg-accent/15 text-accent'
            : phases[phase].status === 'completed'
              ? 'text-surface hover:bg-hover'
              : canJumpTo(phase)
                ? 'text-muted hover:bg-hover hover:text-surface'
                : 'text-muted opacity-40',
          canJumpTo(phase) ? 'cursor-pointer' : 'cursor-not-allowed',
        ]"
        :disabled="!canJumpTo(phase)"
        :title="PHASE_LABELS[phase]"
        @click="onPhaseClick(phase)"
      >
        <icon-lucide-check v-if="phases[phase].status === 'completed'" class="size-3" />
        <span
          v-else
          class="flex size-3 items-center justify-center rounded-full text-[9px] leading-none"
          :class="phase === currentPhase ? 'bg-accent/20' : 'bg-border/20'"
        >{{ i + 1 }}</span>
        <span>{{ PHASE_LABELS[phase] }}</span>
      </button>
      <icon-lucide-chevron-right
        v-if="i < PIPELINE_PHASES.length - 1"
        class="size-3 text-border/30"
      />
    </template>
  </div>
</template>
