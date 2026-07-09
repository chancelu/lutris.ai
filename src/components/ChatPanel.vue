<script setup lang="ts">
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { computed, markRaw, nextTick, ref, watch } from 'vue'

import { copyChatLog } from '@/ai/chat-debug'
import { isTextUIPart } from 'ai'
import ChatInput from '@/components/chat/ChatInput.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import ProviderSetup from '@/components/chat/ProviderSetup.vue'
import AIContextCards from '@/components/AIContextCards.vue'
import { useAIChat } from '@/composables/use-chat'
import { useAISelect } from '@/composables/use-ai-select'
import { useSpec } from '@/composables/use-spec'
import { toast } from '@/composables/use-toast'
import { useEditorStore } from '@/stores/editor'
import { AI_PROVIDERS } from '@open-pencil/core'

import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'

const IS_DEV = import.meta.env.DEV

const editorStore = useEditorStore()
const hasCanvasContent = computed(() => {
  const page = editorStore.graph.nodes.get(editorStore.state.currentPageId)
  return (page?.childIds?.length ?? 0) > 0
})

const { isConfigured, ensureChat, resetChat, pendingMessage, pendingSystemPrefix, aiProgress, providerID, isServerConfigured, activeTab, aiMode, inlinePanel, saveChatToProject, chatInstanceVersion } = useAIChat()
const { hasContext, buildContextPrompt, clearAIContext } = useAISelect()

const existing = ensureChat()
const chat = ref<Chat<UIMessage> | null>(existing ? markRaw(existing) : null)

// When chat is re-created after IDB restore, pick up the new instance
watch(chatInstanceVersion, () => {
  const c = ensureChat()
  if (c) chat.value = markRaw(c)
})
const messagesEnd = ref<HTMLDivElement>()
const debugCopied = ref(false)
const chatError = ref<string | null>(null)
const lastUserMessage = ref<string | null>(null)

const messages = computed(() => chat.value?.messages ?? [])
const status = computed(() => chat.value?.status ?? 'ready')
const chatSdkError = computed(() => chat.value?.error)

watch(chatSdkError, (err) => {
  if (err) {
    console.error('[AI Chat] SDK error:', err)
    // Detect CORS / network errors and provide actionable guidance
    const msg = err.message || String(err)
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS')) {
      chatError.value = 'Network error — if using Anthropic directly, their API blocks browser requests (CORS). Use OpenRouter or a proxy instead.'
    } else {
      chatError.value = msg
    }
  }
})

const progressLabel = computed(() => {
  switch (aiProgress.value) {
    case 'analyzing': return 'Analyzing...'
    case 'generating': return 'Generating...'
    case 'generating-design': return 'Generating design on canvas...'
    case 'verifying': return 'Verifying...'
    case 'creating-image': return 'Creating image...'
    case 'importing': return 'Importing...'
    default: return ''
  }
})

const providerDef = computed(() => AI_PROVIDERS.find((p) => p.id === providerID.value))

function scrollToBottom() {
  nextTick(() => {
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })
}

watch(() => messages.value.length, scrollToBottom)

watch(pendingMessage, (msg) => {
  if (!msg) return
  const prefix = pendingSystemPrefix.value
  pendingSystemPrefix.value = null
  if (prefix) aiProgress.value = 'generating-design'
  handleSubmit(msg, prefix ?? undefined)
  pendingMessage.value = null
})

function handleSubmit(text: string, systemPrefix?: string) {
  lastUserMessage.value = text

  if (!chat.value) {
    const c = ensureChat()
    if (c) chat.value = markRaw(c)
  }
  const contextSuffix = hasContext.value ? buildContextPrompt() : ''
  const fullText = (systemPrefix ?? '') + text + contextSuffix
  chatError.value = null
  chat.value?.sendMessage({ text: fullText }).catch((err) => {
    console.error('[AI Chat] sendMessage failed:', err)
    chatError.value = err?.message || 'Failed to send message'
  })
  // Persist chat after user sends a message so it survives refresh
  requestAnimationFrame(() => saveChatToProject())
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

function prefillPrompt(prompt: string) {
  const { draftMessage } = useAIChat()
  draftMessage.value = prompt
  activeTab.value = 'create'
}

function handleSaveSummary(content: string) {
  const { appendSummary } = useSpec()
  appendSummary(`## Summary\n\n${content}`, 'ai', 'Saved to spec summary')
  toast.show('Saved to spec summary ✅')
}

function handleSaveRequirements(content: string) {
  // 结构化 Page/Component 拆解交给 Spec 面板里的 AI 工具调用完成；
  // 这里只做兜底：把 AI 产出的需求文本存进 freeform notes，用户可在 Spec 面板里手动拆解成 Page。
  const { appendSummary } = useSpec()
  appendSummary(`## Requirements Draft\n\n${content}`, 'ai', 'Saved requirements draft from AI')
  toast.show('Saved as requirements draft ✅')
}

function handleCreateSpecDraft(content: string) {
  const { createSpecDraftFromAI } = useSpec()
  createSpecDraftFromAI(content)
  toast.show('Spec created! Edit it in the Spec panel, or ask me to generate designs from it.')
  nextTick(() => {
    inlinePanel.value = 'spec'
  })
}

const specDraftCreated = ref(false)

function handleCreateSpecFromAll() {
  if (specDraftCreated.value) return
  const { createSpecDraftFromAI } = useSpec()
  const assistantTexts = messages.value
    .filter(m => m.role === 'assistant')
    .map(m => m.parts.filter(isTextUIPart).map(p => p.text).join(''))
    .filter(Boolean)
    .join('\n\n---\n\n')
  if (!assistantTexts) {
    toast.show('No text content from AI to create spec draft', 'warning')
    return
  }
  createSpecDraftFromAI(assistantTexts)
  specDraftCreated.value = true
  toast.show('Spec draft created! Switching to Spec panel...')
  setTimeout(() => {
    inlinePanel.value = 'spec'
  }, 600)
  setTimeout(() => { specDraftCreated.value = false }, 3000)
}
</script>

<template>
  <div data-test-id="chat-panel" class="flex min-w-0 flex-1 flex-col overflow-hidden select-text">
    <ProviderSetup v-if="!isConfigured" />

    <template v-else>
      <ScrollAreaRoot class="min-h-0 flex-1">
        <ScrollAreaViewport class="h-full px-3 py-3 [&>div]:h-full">
          <div
            v-if="messages.length === 0"
            data-test-id="chat-empty-state"
            class="flex h-full flex-col items-center justify-center px-6 py-8"
          >
            <icon-lucide-sparkles class="size-6 text-accent/60" />
            <p class="mt-4 text-[14px] font-medium text-surface/80">What would you like to create?</p>
            <p class="mt-1 text-[11px] text-muted/60">Describe a screen, component, or layout</p>
            <button
              v-if="hasCanvasContent"
              class="mt-4 flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/5 px-3 py-1.5 text-[12px] text-accent transition hover:bg-accent/10"
              @click="handleSubmit('Analyze the imported design and create a product spec')"
            >
              <icon-lucide-scan-search class="size-3.5" />
              Analyze imported design
            </button>
          </div>

          <div v-else data-test-id="chat-messages" class="flex flex-col gap-3">
            <ChatMessage
              v-for="msg in messages"
              :key="msg.id"
              :message="msg"
              @save-summary="handleSaveSummary"
              @save-requirements="handleSaveRequirements"
              @create-spec-draft="handleCreateSpecDraft"
            />

            <div
              v-if="progressLabel && (status === 'submitted' || status === 'streaming')"
              data-test-id="chat-progress-status"
              class="flex items-center gap-2 px-2 py-1 text-[11px] text-muted animate-pulse"
            >
              <icon-lucide-loader-2 class="size-3 animate-spin" />
              <span>{{ progressLabel }}</span>
            </div>

            <div
              v-if="status === 'submitted'"
              data-test-id="chat-typing-indicator"
              class="flex gap-2"
            >
              <div class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20 text-[11px] font-bold text-muted">
                AI
              </div>
              <div class="flex items-center gap-1 py-2">
                <span class="size-1.5 animate-bounce rounded-full bg-muted" style="animation-delay: 0ms" />
                <span class="size-1.5 animate-bounce rounded-full bg-muted" style="animation-delay: 150ms" />
                <span class="size-1.5 animate-bounce rounded-full bg-muted" style="animation-delay: 300ms" />
              </div>
            </div>

            <div ref="messagesEnd" />
          </div>
        </ScrollAreaViewport>
        <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
          <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/30" />
        </ScrollAreaScrollbar>
      </ScrollAreaRoot>

      <div v-if="messages.length > 0" class="flex shrink-0 items-center gap-1 border-t border-border px-3 py-1">
        <button
          v-if="IS_DEV"
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
          @click="handleCopyDebug"
        >
          <icon-lucide-clipboard-copy v-if="!debugCopied" class="size-3" />
          <icon-lucide-check v-else class="size-3 text-green-400" />
          {{ debugCopied ? 'Copied' : 'Copy log' }}
        </button>
        <button
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
          @click="handleClearChat"
        >
          <icon-lucide-trash-2 class="size-3" />
          Clear
        </button>
        <button
          class="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-all duration-300"
          :class="specDraftCreated ? 'bg-green-500/15 text-green-400 scale-105' : 'text-accent hover:bg-accent/10'"
          title="Create a structured spec draft from all AI responses"
          @click="handleCreateSpecFromAll"
        >
          <icon-lucide-check v-if="specDraftCreated" class="size-3" />
          <icon-lucide-file-plus v-else class="size-3" />
          {{ specDraftCreated ? 'Spec created!' : 'Create spec draft' }}
        </button>
      </div>

      <AIContextCards />

      <div
        v-if="chatError"
        class="flex items-center gap-2 border-t border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-400"
      >
        <icon-lucide-alert-circle class="size-3 shrink-0" />
        <span class="min-w-0 flex-1 truncate">{{ chatError }}</span>
        <button
          v-if="lastUserMessage"
          class="shrink-0 rounded px-1.5 py-0.5 text-red-400 transition hover:bg-red-500/15 hover:text-red-300"
          @click="chatError = null; handleSubmit(lastUserMessage!)"
        >
          Retry
        </button>
        <button class="shrink-0 text-red-400 hover:text-red-300" @click="chatError = null">✕</button>
      </div>

      <ChatInput :status="status" @submit="handleSubmit" @stop="handleStop" />
    </template>
  </div>
</template>
