<script setup lang="ts">
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { computed, markRaw, nextTick, ref, watch } from 'vue'

import { copyChatLog } from '@/ai/chat-debug'
import ChatInput from '@/components/chat/ChatInput.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import ProviderSetup from '@/components/chat/ProviderSetup.vue'
import AIContextCards from '@/components/AIContextCards.vue'
import { useAIChat } from '@/composables/use-chat'
import { useAISelect } from '@/composables/use-ai-select'
import { useI18n } from '@/composables/use-i18n'

import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'

const IS_DEV = import.meta.env.DEV

const { isConfigured, ensureChat, resetChat, pendingMessage, aiProgress } = useAIChat()
const { hasContext, buildContextPrompt, clearAIContext } = useAISelect()
const { t } = useI18n()

const existing = ensureChat()
const chat = ref<Chat<UIMessage> | null>(existing ? markRaw(existing) : null)
const messagesEnd = ref<HTMLDivElement>()
const debugCopied = ref(false)

const messages = computed(() => chat.value?.messages ?? [])
const status = computed(() => chat.value?.status ?? 'ready')

const progressLabel = computed(() => {
  switch (aiProgress.value) {
    case 'analyzing': return t('chat.analyzing')
    case 'generating': return t('chat.generating')
    case 'verifying': return t('chat.verifying')
    case 'creating-image': return t('chat.creatingImage')
    default: return ''
  }
})

function scrollToBottom() {
  nextTick(() => {
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })
}

watch(messages, scrollToBottom, { deep: true })

// Watch for pending messages from other panels (e.g. Product Doc → AI)
watch(pendingMessage, (msg) => {
  if (!msg) return
  handleSubmit(msg)
  pendingMessage.value = null
})

function handleSubmit(text: string) {
  if (!chat.value) {
    const c = ensureChat()
    if (c) chat.value = markRaw(c)
  }
  // Append AI selection context if any elements are selected
  const contextSuffix = hasContext.value ? buildContextPrompt() : ''
  const fullText = text + contextSuffix
  chat.value?.sendMessage({ text: fullText }).catch(() => {
    /* user-facing error handled by UI */
  })
  // Clear context after sending so next message starts fresh
  if (hasContext.value) clearAIContext()
}

function handleStop() {
  chat.value?.stop()
}

async function handleCopyDebug() {
  await copyChatLog(messages.value)
  debugCopied.value = true
  setTimeout(() => {
    debugCopied.value = false
  }, 1500)
}

function handleClearChat() {
  chat.value = null
  resetChat()
}
</script>

<template>
  <div data-test-id="chat-panel" class="flex min-w-0 flex-1 flex-col overflow-hidden select-text">
    <ProviderSetup v-if="!isConfigured" />

    <template v-else>
      <ScrollAreaRoot class="min-h-0 flex-1">
        <ScrollAreaViewport class="h-full px-3 py-3 [&>div]:h-full">
          <!-- Empty state -->
          <div
            v-if="messages.length === 0"
            data-test-id="chat-empty-state"
            class="flex h-full flex-col items-center justify-center gap-3 text-muted"
          >
            <icon-lucide-message-circle class="size-8 opacity-50" />
            <p class="text-center text-xs">{{ t('chat.emptyState') }}</p>
          </div>

          <!-- Messages -->
          <div v-else data-test-id="chat-messages" class="flex flex-col gap-3">
            <ChatMessage v-for="msg in messages" :key="msg.id" :message="msg" />

            <!-- AI progress status -->
            <div
              v-if="progressLabel && (status === 'submitted' || status === 'streaming')"
              data-test-id="chat-progress-status"
              class="flex items-center gap-2 px-2 py-1 text-[11px] text-muted animate-pulse"
            >
              <icon-lucide-loader-2 class="size-3 animate-spin" />
              <span>{{ progressLabel }}</span>
            </div>

            <!-- Typing indicator -->
            <div
              v-if="status === 'submitted'"
              data-test-id="chat-typing-indicator"
              class="flex gap-2"
            >
              <div
                class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20 text-[11px] font-bold text-muted"
              >
                AI
              </div>
              <div class="flex items-center gap-1 py-2">
                <span
                  class="size-1.5 animate-bounce rounded-full bg-muted"
                  style="animation-delay: 0ms"
                />
                <span
                  class="size-1.5 animate-bounce rounded-full bg-muted"
                  style="animation-delay: 150ms"
                />
                <span
                  class="size-1.5 animate-bounce rounded-full bg-muted"
                  style="animation-delay: 300ms"
                />
              </div>
            </div>

            <div ref="messagesEnd" />
          </div>
        </ScrollAreaViewport>
        <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
          <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/30" />
        </ScrollAreaScrollbar>
      </ScrollAreaRoot>

      <!-- Chat actions toolbar -->
      <div
        v-if="messages.length > 0"
        class="flex shrink-0 items-center gap-1 border-t border-border px-3 py-1"
      >
        <button
          v-if="IS_DEV"
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
          @click="handleCopyDebug"
        >
          <icon-lucide-clipboard-copy v-if="!debugCopied" class="size-3" />
          <icon-lucide-check v-else class="size-3 text-green-400" />
          {{ debugCopied ? t('chat.copied') : t('chat.copyLog') }}
        </button>
        <button
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
          @click="handleClearChat"
        >
          <icon-lucide-trash-2 class="size-3" />
          {{ t('chat.clear') }}
        </button>
      </div>

      <AIContextCards />
      <ChatInput :status="status" @submit="handleSubmit" @stop="handleStop" />
    </template>
  </div>
</template>
