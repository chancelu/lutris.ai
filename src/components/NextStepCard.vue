<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { usePipeline } from '@/composables/use-pipeline'
import { useAIChat } from '@/composables/use-chat'

// Phase-complete card: one-line summary + a single next action.
// Self-contained — derives the current step from pipeline state and hides
// itself once dismissed for the active phase.
const { currentPhase, phases } = usePipeline()
const { inlinePanel, focusRequested } = useAIChat()

const dismissed = ref(false)

// A phase change is a new completion moment — resurface the card.
watch(currentPhase, () => {
  dismissed.value = false
})

const step = computed(() => {
  if (currentPhase.value === 'spec' && phases.value.idea.status === 'completed') {
    return { summary: '想法已整理成需求初稿，确认细节后就能开始设计。', cta: '查看 Spec' }
  }
  if (currentPhase.value === 'design' && phases.value.spec.status === 'completed') {
    return { summary: '需求已确认——页面清单就绪，可以开始设计了。', cta: '开始设计' }
  }
  if (currentPhase.value === 'dev' && phases.value.design.status === 'completed') {
    return { summary: '设计完成——可以导出前端代码了。', cta: '查看代码' }
  }
  return null
})

const visible = computed(() => step.value !== null && !dismissed.value)

function onCta() {
  if (currentPhase.value === 'dev') {
    inlinePanel.value = 'code'
  } else if (currentPhase.value === 'design') {
    // Design: the canvas is the stage, chat is how you shape it.
    inlinePanel.value = null
    focusRequested.value++
  }
  // Spec: Spec Studio 已经是主区，卡片让路即可
  dismissed.value = true
}
</script>

<template>
  <div
    v-if="visible"
    data-test-id="next-step-card"
    class="glass flex animate-in items-center gap-2.5 rounded-xl border border-accent/20 px-3 py-2.5 fade-in slide-in-from-bottom-1 duration-300"
  >
    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/15">
      <icon-lucide-sparkles class="size-3 text-accent" />
    </span>
    <p class="min-w-0 flex-1 text-[11px] leading-4 text-muted">{{ step!.summary }}</p>
    <button
      data-test-id="next-step-cta"
      class="gradient-cta shrink-0 rounded-full px-3 py-1 text-[11px] font-medium text-on-accent transition-[filter] hover:brightness-110"
      @click="onCta"
    >
      {{ step!.cta }}
    </button>
    <button
      class="flex size-5 shrink-0 items-center justify-center rounded text-muted/60 transition hover:bg-hover hover:text-surface"
      title="Dismiss"
      @click="dismissed = true"
    >
      <icon-lucide-x class="size-3" />
    </button>
  </div>
</template>
