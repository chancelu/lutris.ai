<script setup lang="ts">
import { computed, ref } from 'vue'

import { useEditorStore } from '@/stores/editor'
import { useAIChat } from '@/composables/use-chat'

const store = useEditorStore()
const { draftMessage, activeTab } = useAIChat()

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
    return !!(page?.childIds && page.childIds.length > 0)
  }
})

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
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
    >
      <div class="pointer-events-auto w-full max-w-lg rounded-2xl bg-canvas/80 px-6 py-8 text-center backdrop-blur-sm">
        <icon-lucide-sparkles class="mx-auto size-8 text-accent/50" />
        <h2 class="mt-4 text-[24px] font-semibold tracking-tight text-surface sm:text-[28px]">What do you want to create?</h2>
        <p class="mt-2 text-[13px] text-muted/60">Describe any interface and watch it come to life</p>

        <button
          class="group mt-6 w-full rounded-2xl border border-accent/15 bg-panel/80 px-6 py-4 text-left text-[15px] text-muted/60 shadow-sm backdrop-blur-sm transition-all hover:border-accent/30 hover:shadow-md hover:shadow-accent/5"
          @click="handleAction('ai')"
        >
          <span class="flex items-center gap-3">
            <icon-lucide-message-square class="size-4 text-accent/40 transition group-hover:text-accent/70" />
            Describe the interface you want...
          </span>
        </button>

        <div class="mt-5 flex items-center justify-center gap-2 text-[12px]">
          <button class="rounded-full border border-border/30 px-3 py-1.5 text-muted/50 transition hover:border-border/60 hover:text-surface" @click="handleAction('import-fig')">Import .fig file</button>
          <button class="rounded-full border border-border/30 px-3 py-1.5 text-muted/50 transition hover:border-border/60 hover:text-surface" @click="handleAction('import-prd')">Import PRD</button>
          <button class="rounded-full border border-border/30 px-3 py-1.5 text-muted/50 transition hover:border-border/60 hover:text-surface" @click="handleAction('blank')">Start from template</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
