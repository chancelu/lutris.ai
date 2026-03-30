<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger
} from 'reka-ui'
import { computed, ref, watch, nextTick } from 'vue'

import ProviderSettings from '@/components/chat/ProviderSettings.vue'
import { uiInput } from '@/components/ui/input'
import { useAIChat } from '@/composables/use-chat'

const { isServerConfigured, draftMessage, focusRequested } = useAIChat()

const { status } = defineProps<{
  status: 'ready' | 'submitted' | 'streaming' | 'error'
}>()

const emit = defineEmits<{
  submit: [text: string]
  stop: []
}>()

const input = ref(draftMessage.value || '')
const inputEl = ref<HTMLInputElement | null>(null)

const isStreaming = computed(() => status === 'streaming' || status === 'submitted')

watch(draftMessage, (value) => {
  if (value !== input.value) input.value = value
})

watch(input, (value) => {
  draftMessage.value = value
})

watch(focusRequested, () => {
  nextTick(() => inputEl.value?.focus())
})

function handleSubmit(e: Event) {
  e.preventDefault()
  const text = input.value.trim()
  if (!text) return
  emit('submit', text)
  input.value = ''
  draftMessage.value = ''
}
</script>

<template>
  <TooltipProvider>
    <div class="shrink-0 border-t border-border px-3 py-2">
      <!-- Model settings (collapsed to gear icon) -->
      <div v-if="!isServerConfigured" class="mb-1 flex items-center justify-end">
        <ProviderSettings />
      </div>

      <!-- Input form -->
      <form class="flex items-center gap-1.5" @submit="handleSubmit">
        <input
          ref="inputEl"
          v-model="input"
          type="text"
          data-test-id="chat-input"
          placeholder="Describe what you want to create..."
          :class="uiInput({ class: 'min-w-0 flex-1 rounded-lg py-2 text-[13px] placeholder:text-muted/60 ring-1 ring-accent/20 focus:ring-accent/50 transition-shadow' })"
          :disabled="status === 'submitted'"
          @paste.stop
          @copy.stop
          @cut.stop
        />
        <TooltipRoot v-if="isStreaming">
          <TooltipTrigger as-child>
            <button
              type="button"
              data-test-id="chat-stop-button"
              class="flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border px-2.5 py-2 text-muted transition-colors hover:bg-hover hover:text-surface"
              @click="emit('stop')"
            >
              <icon-lucide-square class="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              side="top"
              :side-offset="4"
              class="rounded bg-surface px-2 py-1 text-[10px] text-canvas"
            >
              Stop generating
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
        <TooltipRoot v-else>
          <TooltipTrigger as-child>
            <button
              type="submit"
              data-test-id="chat-send-button"
              class="flex shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent px-2.5 py-2 text-white transition-colors hover:bg-accent/90 disabled:opacity-40"
              :disabled="!input.trim()"
            >
              <icon-lucide-send class="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              side="top"
              :side-offset="4"
              class="rounded bg-surface px-2 py-1 text-[10px] text-canvas"
            >
              Send message
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </form>
    </div>
  </TooltipProvider>
</template>
