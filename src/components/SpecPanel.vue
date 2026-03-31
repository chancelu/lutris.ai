<script setup lang="ts">
import { computed } from 'vue'
import ProductDocPanel from './ProductDocPanel.vue'
import { useSpec } from '@/composables/use-spec'
import { useAIChat } from '@/composables/use-chat'

const { summary } = useSpec()
const { pendingMessage, inlinePanel } = useAIChat()

const hasSummary = computed(() => summary.value.trim().length > 0)

function generateDesignFromSpec() {
  if (!hasSummary.value) return
  pendingMessage.value = `Based on the following spec, generate a UI design on the canvas. Focus on the key screens and user flows described.\n\n---\n\n${summary.value}`
  inlinePanel.value = null // switch back to AI Chat
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-auto">
    <!-- Generate Design CTA -->
    <div v-if="hasSummary" class="shrink-0 border-b border-border px-3 py-2.5">
      <button
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-accent/85"
        @click="generateDesignFromSpec"
      >
        <icon-lucide-wand-2 class="size-3.5" />
        Generate Design from Spec
      </button>
      <p class="mt-1.5 text-center text-[10px] text-muted">AI will create UI screens based on your spec</p>
    </div>

    <!-- Document content -->
    <div class="min-h-0 flex-1 overflow-auto">
      <ProductDocPanel default-section="summary" class="min-h-0 flex-1" />
    </div>
  </div>
</template>
