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
    return !!(page?.children && page.children.length > 0)
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
      class="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[1px]"
    >
      <div class="w-full max-w-md px-4 text-center">
        <h2 class="text-[22px] font-semibold text-surface sm:text-[26px]">What do you want to make?</h2>

        <button
          class="mt-5 w-full rounded-xl bg-inset/40 px-5 py-3.5 text-left text-[14px] text-muted/70 transition hover:bg-inset/60 hover:text-muted"
          @click="handleAction('ai')"
        >
          Describe the interface you want…
        </button>

        <div class="mt-4 flex items-center justify-center gap-3 text-[12px] text-muted/50">
          <span>or</span>
          <button class="transition hover:text-surface" @click="handleAction('import-fig')">import .fig</button>
          <span>·</span>
          <button class="transition hover:text-surface" @click="handleAction('import-prd')">import PRD</button>
          <span>·</span>
          <button class="transition hover:text-surface" @click="handleAction('blank')">blank canvas</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
