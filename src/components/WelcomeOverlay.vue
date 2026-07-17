<script setup lang="ts">
import { computed, ref } from 'vue'

import { useEditorStore } from '@/stores/editor'
import { usePipeline } from '@/composables/use-pipeline'

const store = useEditorStore()
const { currentPhase } = usePipeline()

// Idea-phase entry: describe the idea in chat, import an existing PRD, or
// skip straight to a blank canvas (skipToDesign). The overlay is the guide —
// no card chrome, content floats on the dimmed canvas.
const emit = defineEmits<{
  action: [type: 'ai' | 'import-prd' | 'blank-canvas']
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
    return !!(page?.childIds && page.childIds.length > 0)
  }
})

const showOverlay = computed(
  () => !dismissed.value && !hasContent.value && currentPhase.value === 'idea'
)

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
      data-test-id="welcome-overlay"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-canvas/60"
    >
      <div class="pointer-events-auto flex w-full max-w-md flex-col items-center px-6 text-center">
        <img src="/lutris-otter.png" class="h-28 w-auto object-contain" alt="" />
        <h2 class="mt-5 text-[24px] font-semibold tracking-tight text-surface sm:text-[28px]">What do you want to build?</h2>
        <p class="mt-2 text-[13px] text-muted">Describe it — the otter drafts the spec, design, and code.</p>

        <button
          data-test-id="welcome-describe-idea"
          class="mt-7 flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-[14px] font-medium text-white shadow-sm transition hover:bg-accent/90"
          @click="handleAction('ai')"
        >
          <icon-lucide-message-square class="size-4" />
          Describe your idea
        </button>

        <div class="mt-5 flex items-center gap-2 text-[12px] text-muted/70">
          <button
            data-test-id="welcome-import-prd"
            class="transition hover:text-surface"
            @click="handleAction('import-prd')"
          >Import PRD</button>
          <span class="text-muted/40">·</span>
          <button
            data-test-id="welcome-blank-canvas"
            class="transition hover:text-surface"
            @click="handleAction('blank-canvas')"
          >Start from a blank canvas</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
