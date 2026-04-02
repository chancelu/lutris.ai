<script setup lang="ts">
import { computed } from 'vue'
import ProductDocPanel from './ProductDocPanel.vue'
import { useSpec } from '@/composables/use-spec'
import { useAIChat } from '@/composables/use-chat'
import { useEditorStore } from '@/stores/editor'

const { summary } = useSpec()
const { pendingMessage, pendingSystemPrefix, inlinePanel } = useAIChat()
const store = useEditorStore()

const hasSummary = computed(() => summary.value.trim().length > 0)
const hasCanvasContent = computed(() => {
  const page = store.graph.nodes.get(store.state.currentPageId)
  return (page?.childIds?.length ?? 0) > 0
})

function generateDesignFromSpec() {
  if (!hasSummary.value) return
  pendingSystemPrefix.value = 'CRITICAL INSTRUCTION: You MUST call the render() tool IMMEDIATELY as your FIRST and ONLY action. Do NOT write ANY text, explanation, or planning. Just call render() with complete JSX code. ANY text response without a render() call is a FAILURE.\n\nImplement this spec on canvas NOW:\n\n'
  pendingMessage.value = 'Generate design from this spec:\n\n' + summary.value
  inlinePanel.value = null // switch back to AI Chat
}

function updateSpecFromDesign() {
  pendingSystemPrefix.value = 'CRITICAL INSTRUCTION: Call design_overview, then describe each screen, then update the existing spec to reflect the current design state. Focus on what changed.\n\n'
  pendingMessage.value = 'Update the spec based on the current design on canvas.'
  inlinePanel.value = null
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-auto">
    <!-- Generate Design CTA -->
    <div v-if="hasSummary || hasCanvasContent" class="shrink-0 border-b border-border px-3 py-2.5 space-y-2">
      <button
        v-if="hasSummary"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-accent/85"
        @click="generateDesignFromSpec"
      >
        <icon-lucide-wand-2 class="size-3.5" />
        Generate Design from Spec
      </button>
      <button
        v-if="hasCanvasContent"
        class="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 text-[12px] font-medium text-accent transition hover:bg-accent/10"
        @click="updateSpecFromDesign"
      >
        <icon-lucide-scan-search class="size-3.5" />
        Update Spec from Design
      </button>
      <p v-if="hasSummary" class="text-center text-[10px] text-muted">AI will create UI screens based on your spec</p>
    </div>

    <!-- Document content -->
    <div class="min-h-0 flex-1 overflow-auto">
      <ProductDocPanel default-section="summary" class="min-h-0 flex-1" />
    </div>
  </div>
</template>
