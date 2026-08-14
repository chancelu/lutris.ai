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
  <!-- R15: 与右栏 tab 同一套"内凹轨道 + 浮起当前段"语言。
       当前段 = 浮起玻璃片 + 渐变状态点；完成段 = accent 对勾；未解锁 = 降透明度。
       去掉了 R14 的数字徽章和 chevron——四个词本身已足够表意。 -->
  <div
    class="glass flex items-center rounded-full border border-border/40 p-0.5 shadow-xl shadow-black/25"
    data-test-id="pipeline-phase-stepper"
  >
    <button
      v-for="(phase, i) in PIPELINE_PHASES"
      :key="phase"
      type="button"
      class="flex h-7 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-medium transition"
      :class="[
        phase === currentPhase
          ? 'bg-panel text-surface shadow-md shadow-black/20'
          : phases[phase].status === 'completed'
            ? 'text-surface/80 hover:bg-hover hover:text-surface'
            : canJumpTo(phase)
              ? 'text-muted hover:bg-hover hover:text-surface'
              : 'text-muted opacity-40',
        canJumpTo(phase) ? 'cursor-pointer' : 'cursor-not-allowed',
      ]"
      :disabled="!canJumpTo(phase)"
      :title="`工作流阶段 ${i + 1}/4 · ${PHASE_LABELS[phase]}`"
      @click="onPhaseClick(phase)"
    >
      <span
        v-if="phase === currentPhase"
        class="size-1.5 rounded-full"
        :style="{ background: 'var(--gradient-accent)' }"
      />
      <icon-lucide-check
        v-else-if="phases[phase].status === 'completed'"
        class="size-3 text-accent"
      />
      <span>{{ PHASE_LABELS[phase] }}</span>
    </button>
  </div>
</template>
