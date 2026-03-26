<script setup lang="ts">
import { computed, ref } from 'vue'

import { useEditorStore } from '@/stores/editor'
import { useAIChat } from '@/composables/use-chat'

const store = useEditorStore()
const { draftMessage, activeTab, aiModeLabel, aiModeTone } = useAIChat()

const emit = defineEmits<{
  action: [type: 'blank' | 'template' | 'ai' | 'import' | 'import-prd' | 'import-fig' | 'import-code']
}>()

const dismissed = ref(false)

const hasContent = computed(() => {
  void store.state.sceneVersion
  const pageId = store.state.currentPageId
  if (!pageId) return false
  try {
    const children = store.graph.getChildren(pageId)
    return children.length > 0
  } catch {
    const page = store.graph.nodes.get(pageId)
    return !!(page?.children && page.children.length > 0)
  }
})

const quickPrompts = [
  'Create a clean SaaS landing page with pricing and testimonials',
  'Design a modern analytics dashboard for a startup founder',
  'Turn a rough product idea into a mobile onboarding flow'
]

function usePrompt(prompt: string) {
  draftMessage.value = prompt
  activeTab.value = 'create'
  dismissed.value = true
}

const showOverlay = computed(() => !dismissed.value && !hasContent.value)

function handleAction(type: Parameters<typeof emit>[1]) {
  dismissed.value = true
  emit('action', type)
}
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-200"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showOverlay"
      class="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
    >
      <div class="w-full max-w-2xl px-4 sm:px-6">
        <div class="rounded-[28px] border border-border bg-panel/95 p-4 shadow-2xl shadow-black/20 sm:p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-[20px] font-semibold text-surface sm:text-[24px]">What do you want to make?</h2>
              <p class="mt-1 max-w-md text-[12px] leading-5 text-muted sm:text-[13px] sm:leading-6">
                Start from a prompt, a file, or a blank canvas.
              </p>
            </div>
            <div class="rounded-full border px-2 py-0.5 text-[10px] font-medium" :class="aiModeTone">
              {{ aiModeLabel }}
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              class="flex-1 rounded-2xl border border-border bg-inset/30 px-4 py-2.5 text-left text-[13px] text-muted transition hover:border-accent/40 hover:bg-accent/5 hover:text-surface"
              @click="handleAction('ai')"
            >
              Describe the interface you want…
            </button>
            <button
              class="rounded-2xl bg-accent px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent/90"
              @click="handleAction('ai')"
            >
              Start with prompt
            </button>
          </div>
          <div class="mt-2 hidden flex-wrap gap-1.5 sm:flex">
            <button
              v-for="prompt in quickPrompts"
              :key="prompt"
              class="rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted/70 transition hover:border-accent/40 hover:text-muted"
              @click="usePrompt(prompt)"
            >
              {{ prompt.length > 38 ? `${prompt.slice(0, 38)}…` : prompt }}
            </button>
          </div>

          <div class="mt-3 flex gap-2 sm:mt-4 sm:grid sm:grid-cols-3 sm:gap-3">
            <button
              class="flex-1 rounded-xl border border-border/60 p-3 text-left transition hover:border-accent/35 hover:bg-accent/5 sm:rounded-2xl sm:p-4"
              @click="handleAction('import-fig')"
            >
              <div class="text-[12px] font-medium text-surface sm:text-[13px]">Import .fig</div>
              <div class="mt-0.5 hidden text-[11px] leading-5 text-muted sm:block">From an existing design file.</div>
            </button>
            <button
              class="flex-1 rounded-xl border border-border/60 p-3 text-left transition hover:border-accent/35 hover:bg-accent/5 sm:rounded-2xl sm:p-4"
              @click="handleAction('import-prd')"
            >
              <div class="text-[12px] font-medium text-surface sm:text-[13px]">Import PRD</div>
              <div class="mt-0.5 hidden text-[11px] leading-5 text-muted sm:block">Turn a spec into UI direction.</div>
            </button>
            <button
              class="flex-1 rounded-xl border border-border/60 p-3 text-left transition hover:border-accent/35 hover:bg-accent/5 sm:rounded-2xl sm:p-4"
              @click="handleAction('blank')"
            >
              <div class="text-[12px] font-medium text-surface sm:text-[13px]">Blank canvas</div>
              <div class="mt-0.5 hidden text-[11px] leading-5 text-muted sm:block">Start directly on the canvas.</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
