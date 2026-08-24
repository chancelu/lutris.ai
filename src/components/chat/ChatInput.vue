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
import { useAIChat } from '@/composables/use-chat'
import { usePipeline } from '@/composables/use-pipeline'

const { draftMessage, focusRequested } = useAIChat()
const { currentPhase } = usePipeline()

// 阶段感知的输入提示——每个阶段告诉用户"现在该说什么"
const placeholder = computed(() => {
  switch (currentPhase.value) {
    case 'idea': return '描述你的产品想法…'
    case 'spec': return '补充需求细节，或让我直接拆页面…'
    case 'design': return '描述要生成或调整的界面…'
    case 'dev': return '让我导出 Vue / React 代码…'
    default: return '说点什么…'
  }
})

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
    <!-- R15: 无分隔线，输入区做成整体胶囊容器，发送按钮嵌在胶囊里 -->
    <div class="shrink-0 px-3 pb-3 pt-1">
      <!-- Model settings (collapsed to gear icon). Always rendered: TopBar's
           "AI provider settings" menu opens this trigger, so hiding it when
           server-configured would turn that menu item into a dead end. -->
      <div class="mb-1 flex items-center justify-end">
        <ProviderSettings />
      </div>

      <!-- Input form -->
      <form
        class="flex items-center gap-1 rounded-full border border-border/40 bg-black/20 py-1 pl-4 pr-1 transition-shadow focus-within:border-accent/40 focus-within:ring-1 focus-within:ring-accent/30"
        @submit="handleSubmit"
      >
        <input
          ref="inputEl"
          v-model="input"
          type="text"
          data-test-id="chat-input"
          :placeholder="placeholder"
          class="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] text-surface outline-none placeholder:text-muted/60"
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
              class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-surface"
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
              class="gradient-cta glow-accent flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-on-accent transition-[filter] hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
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
