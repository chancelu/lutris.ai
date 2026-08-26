<script setup lang="ts">
// ── Plan 面板：agent 化后右栏的主角 ──
// 用户的视线主路径：目标 → 计划步骤实时打勾 → 检查点决策 → 验收。
// Chat 退居"审计轨迹 + 插话通道"，这里才是"看管和决策"的地方。
import { computed, ref } from 'vue'

import { useAgentRun } from '@/composables/use-agent-run'
import { usePipeline } from '@/composables/use-pipeline'

const { plan, run, currentStep, resolveCheckpoint, stopRun, selfCheckReport } = useAgentRun()
const { jumpToPhase } = usePipeline()

const STATUS_LABEL: Record<string, string> = {
  idle: '空闲',
  running: '执行中',
  'paused-checkpoint': '等你决策',
  completed: '已完成',
  failed: '已中止',
  stopped: '已停止',
}

const pending = computed(() => plan.value?.pendingCheckpoint ?? null)
const clarifyAnswer = ref('')
const clarifyPicked = ref<string | null>(null)

function submitClarify() {
  const answer = clarifyPicked.value ?? clarifyAnswer.value.trim()
  resolveCheckpoint({ answer: answer || undefined })
  clarifyPicked.value = null
  clarifyAnswer.value = ''
}

function goApproveSpec() {
  jumpToPhase('spec')
  // 真正的恢复发生在用户在 Spec Studio 点「确认 Spec，开始设计 →」时
  // （SpecPanel.confirmSpec 会调 resolveCheckpoint）
}

const STEP_ICON: Record<string, string> = {
  pending: '○',
  running: '◐',
  done: '●',
  blocked: '◍',
  skipped: '–',
  failed: '✕',
}
</script>

<template>
  <div data-test-id="plan-panel" class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <!-- 空态：还没有 run -->
    <div
      v-if="!plan"
      class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <icon-lucide-list-checks class="size-8 text-muted/50" />
      <p class="text-[12px] text-muted">还没有进行中的任务</p>
      <p class="text-[11px] text-muted/60">在对话里说出你的产品目标，agent 会给出执行计划</p>
    </div>

    <template v-else>
      <!-- 目标 + 状态 -->
      <div class="shrink-0 border-b border-border/30 px-4 py-3">
        <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-accent/80">目标</p>
        <p data-test-id="plan-goal" class="mt-1 line-clamp-2 text-[13px] leading-snug text-surface">
          {{ plan.goal }}
        </p>
        <div class="mt-2 flex items-center gap-2">
          <span
            data-test-id="run-status"
            class="rounded-full px-2 py-0.5 text-[10px] font-medium"
            :class="{
              'bg-accent/15 text-accent': run.status === 'running',
              'bg-amber-500/15 text-amber-400': run.status === 'paused-checkpoint',
              'bg-green-500/15 text-green-400': run.status === 'completed',
              'bg-red-500/15 text-red-400': run.status === 'failed',
              'bg-hover text-muted': run.status === 'idle' || run.status === 'stopped',
            }"
          >{{ STATUS_LABEL[run.status] }}</span>
          <span class="text-[10px] text-muted/60">{{ run.turnsUsed }} turns</span>
          <div class="flex-1" />
          <button
            v-if="run.status === 'running' || run.status === 'paused-checkpoint'"
            data-test-id="run-stop"
            class="text-[10px] text-muted transition hover:text-red-400"
            @click="stopRun"
          >停止</button>
        </div>
      </div>

      <!-- 步骤列表 -->
      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <div
          v-for="step in plan.steps"
          :key="step.id"
          :data-test-id="`plan-step-${step.id}`"
          :data-status="step.status"
          class="flex items-start gap-2.5 rounded-lg px-2 py-2 transition"
          :class="step.id === currentStep?.id ? 'bg-hover/60' : ''"
        >
          <span
            class="mt-0.5 w-4 shrink-0 text-center text-[11px]"
            :class="{
              'text-accent': step.status === 'running' || step.status === 'blocked',
              'text-green-400': step.status === 'done',
              'text-red-400': step.status === 'failed',
              'text-muted/50': step.status === 'pending' || step.status === 'skipped',
            }"
          >{{ STEP_ICON[step.status] }}</span>
          <div class="min-w-0 flex-1">
            <p
              class="text-[12px] leading-snug"
              :class="step.status === 'done' ? 'text-muted line-through' : 'text-surface'"
            >{{ step.title }}</p>
            <p v-if="step.note" class="mt-0.5 text-[10px] text-muted/70">{{ step.note }}</p>
            <span
              v-if="step.kind === 'checkpoint'"
              class="mt-0.5 inline-block rounded-full border border-border/40 px-1.5 text-[9px] text-muted/70"
            >决策点</span>
          </div>
        </div>
      </div>

      <!-- 检查点决策卡 -->
      <div
        v-if="pending"
        data-test-id="checkpoint-card"
        class="shrink-0 border-t border-accent/30 bg-accent/5 px-4 py-3"
      >
        <!-- clarify：给选项不给作文题 -->
        <template v-if="pending.type === 'clarify' && pending.clarify">
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-accent/80">Agent 提问</p>
          <p data-test-id="clarify-question" class="mt-1 text-[12px] leading-snug text-surface">
            {{ pending.clarify.question }}
          </p>
          <div class="mt-2 flex flex-col gap-1.5">
            <button
              v-for="opt in pending.clarify.options"
              :key="opt"
              :data-test-id="`clarify-option`"
              class="rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition"
              :class="clarifyPicked === opt
                ? 'border-accent bg-accent/15 text-surface'
                : 'border-border/40 text-muted hover:border-accent/50 hover:text-surface'"
              @click="clarifyPicked = opt"
            >{{ opt }}</button>
          </div>
          <input
            v-model="clarifyAnswer"
            data-test-id="clarify-freetext"
            placeholder="或自己补充一句…"
            class="mt-2 w-full rounded-lg border border-border/40 bg-inset px-2.5 py-1.5 text-[11px] text-surface placeholder:text-muted/50 focus:border-accent/60 focus:outline-none"
            @keydown.enter="submitClarify"
          />
          <button
            data-test-id="clarify-submit"
            class="gradient-cta mt-2 w-full rounded-full px-3 py-1.5 text-[11px] font-medium text-on-accent transition-[filter] hover:brightness-110"
            @click="submitClarify"
          >回答并继续</button>
        </template>

        <!-- approve-spec：跳到 Spec Studio 审阅 -->
        <template v-else-if="pending.type === 'approve-spec'">
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-accent/80">决策点</p>
          <p class="mt-1 text-[12px] leading-snug text-surface">Spec 已拆解完成，请审阅</p>
          <p class="mt-1 text-[11px] text-muted">在 Spec Studio 里可以直接改页面、组件和交互规则，确认后 agent 会继续渲染设计。</p>
          <button
            data-test-id="checkpoint-goto-spec"
            class="gradient-cta mt-2 w-full rounded-full px-3 py-1.5 text-[11px] font-medium text-on-accent transition-[filter] hover:brightness-110"
            @click="goApproveSpec"
          >去审阅 Spec →</button>
        </template>

        <!-- accept-delivery：自检报告 + 验收 -->
        <template v-else-if="pending.type === 'accept-delivery'">
          <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-accent/80">交付验收</p>
          <div v-if="selfCheckReport" data-test-id="selfcheck-report" class="mt-2 flex flex-col gap-1">
            <div
              v-for="item in selfCheckReport.items"
              :key="item.label"
              class="flex items-center gap-2 text-[11px]"
            >
              <span :class="item.ok ? 'text-green-400' : 'text-red-400'">{{ item.ok ? '✓' : '✕' }}</span>
              <span class="text-surface">{{ item.label }}</span>
              <span v-if="item.detail" class="text-muted/60">{{ item.detail }}</span>
            </div>
          </div>
          <button
            data-test-id="checkpoint-accept"
            class="gradient-cta mt-2 w-full rounded-full px-3 py-1.5 text-[11px] font-medium text-on-accent transition-[filter] hover:brightness-110"
            @click="resolveCheckpoint()"
          >确认验收，完成交付 ✓</button>
        </template>
      </div>
    </template>
  </div>
</template>
