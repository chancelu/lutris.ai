<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { usePipeline } from '@/composables/use-pipeline'
import { useAIChat } from '@/composables/use-chat'

// Phase-complete card: otter + one-line summary + a single next action.
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
    return { summary: 'Idea brief done — the otter drafted your spec.', cta: 'Review the spec' }
  }
  if (currentPhase.value === 'design' && phases.value.spec.status === 'completed') {
    return { summary: 'Spec done — your pages are ready for design.', cta: 'Start designing' }
  }
  if (currentPhase.value === 'dev' && phases.value.design.status === 'completed') {
    return { summary: 'Design done — the otter can hand you the code.', cta: 'Get the code' }
  }
  return null
})

const visible = computed(() => step.value !== null && !dismissed.value)

function onCta() {
  if (currentPhase.value === 'spec') {
    inlinePanel.value = 'spec'
  } else if (currentPhase.value === 'dev') {
    inlinePanel.value = 'code'
  } else {
    // Design: the canvas is the stage, chat is how you shape it.
    inlinePanel.value = null
    focusRequested.value++
  }
  dismissed.value = true
}
</script>

<template>
  <div
    v-if="visible"
    data-test-id="next-step-card"
    class="flex items-center gap-2.5 rounded-xl border border-border/30 bg-canvas/50 px-3 py-2.5"
  >
    <img src="/lutris-otter.png" class="h-8 w-auto shrink-0 object-contain" alt="" />
    <p class="min-w-0 flex-1 text-[11px] leading-4 text-muted">{{ step!.summary }}</p>
    <button
      data-test-id="next-step-cta"
      class="shrink-0 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-white transition hover:bg-accent/90"
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
