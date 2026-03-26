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
import { AI_PROVIDERS } from '@open-pencil/core'
import { useAISelect } from '@/composables/use-ai-select'
import { useSpec } from '@/composables/use-spec'
import { useI18n } from '@/composables/use-i18n'
import { toast } from '@/composables/use-toast'

import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'

const IS_DEV = import.meta.env.DEV

const { isConfigured, ensureChat, resetChat, pendingMessage, aiProgress, providerID, isServerConfigured, activeTab, aiMode, aiModeLabel, aiModeTone } = useAIChat()
const { hasContext, buildContextPrompt, clearAIContext } = useAISelect()
const { t } = useI18n()

const existing = ensureChat()
const chat = ref<Chat<UIMessage> | null>(existing ? markRaw(existing) : null)
const messagesEnd = ref<HTMLDivElement>()
const debugCopied = ref(false)
const chatError = ref<string | null>(null)

const messages = computed(() => chat.value?.messages ?? [])
const status = computed(() => chat.value?.status ?? 'ready')
const chatSdkError = computed(() => chat.value?.error)

watch(chatSdkError, (err) => {
  if (err) {
    console.error('[AI Chat] SDK error:', err)
    chatError.value = err.message || String(err)
  }
})

const progressLabel = computed(() => {
  switch (aiProgress.value) {
    case 'analyzing': return t('chat.analyzing')
    case 'generating': return t('chat.generating')
    case 'verifying': return t('chat.verifying')
    case 'creating-image': return t('chat.creatingImage')
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
  handleSubmit(msg)
  pendingMessage.value = null
})

function handleSubmit(text: string) {
  const requiresAction = hasContext.value || /(create|generate|build|design|edit|modify|update|redesign|make|layout|screen|page|component|render)/i.test(text)
  if (requiresAction && aiMode.value === 'chat-only') {
    chatError.value = 'Current provider is chat-only. Switch to an action-capable model/provider to generate or modify designs.'
    return
  }

  if (!chat.value) {
    const c = ensureChat()
    if (c) chat.value = markRaw(c)
  }
  const contextSuffix = hasContext.value ? buildContextPrompt() : ''
  const fullText = text + contextSuffix
  chatError.value = null
  chat.value?.sendMessage({ text: fullText }).catch((err) => {
    console.error('[AI Chat] sendMessage failed:', err)
    chatError.value = err?.message || 'Failed to send message'
  })
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
  const { saveRequirementsFromText, appendSummary } = useSpec()
  const count = saveRequirementsFromText(content, 'ai', 'Saved requirements from AI')
  if (count > 0) {
    toast.show(`Saved ${count} requirements ✅`)
    return
  }
  appendSummary(`## Requirements Draft\n\n${content}`, 'ai', 'Saved requirements draft from AI')
  toast.show('Saved as requirements draft ✅')
}

function handleCreateSpecDraft(content: string) {
  const { createSpecDraftFromAI } = useSpec()
  createSpecDraftFromAI(content)
  toast.show('Created spec draft ✅')
}

function handleCreateSpecFromAll() {
  const { createSpecDraftFromAI } = useSpec()
  const assistantTexts = messages.value
    .filter(m => m.role === 'assistant')
    .map(m => m.parts.filter(isTextUIPart).map(p => p.text).join(''))
    .filter(Boolean)
    .join('\n\n---\n\n')
  if (!assistantTexts) return
  createSpecDraftFromAI(assistantTexts)
  toast.show('Created combined spec draft ✅')
}
</script>

<template>
  <div data-test-id="chat-panel" class="flex min-w-0 flex-1 flex-col overflow-hidden select-text">
    <div class="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
      <div class="min-w-0">
        <div class="text-[12px] font-semibold text-surface">Create</div>
        <div class="text-[10px] text-muted">{{ providerDef?.name || 'Provider' }}<span v-if="isServerConfigured"> · Hosted</span><span v-else> · BYOK</span></div>
      </div>
      <div class="rounded-full border px-2 py-1 text-[10px] font-medium" :class="aiModeTone">
        {{ aiModeLabel }}
      </div>
    </div>

    <ProviderSetup v-if="!isConfigured" />

    <template v-else>
      <ScrollAreaRoot class="min-h-0 flex-1">
        <ScrollAreaViewport class="h-full px-3 py-3 [&>div]:h-full">
          <div
            v-if="messages.length === 0"
            data-test-id="chat-empty-state"
            class="flex h-full flex-col justify-center px-4 py-4"
          >
            <div class="mx-auto flex w-full max-w-md flex-col items-center text-center">
              <div class="rounded-full border border-white/10 bg-white/[0.03] p-3 text-white/70">
                <icon-lucide-sparkles class="size-5" />
              </div>
              <p class="mt-4 text-sm font-medium text-surface">Start with a prompt</p>
              <p class="mt-1 max-w-sm text-[11px] leading-5 text-muted">
                Describe a screen, flow, or idea. Refine after the first pass.
              </p>
              <div class="mt-4 flex flex-wrap justify-center gap-2">
                <button class="rounded-full border border-border px-2.5 py-1.5 text-[11px] text-muted transition hover:bg-hover hover:text-surface" @click="prefillPrompt('Create a clean SaaS landing page with pricing and testimonials')">Landing page</button>
                <button class="rounded-full border border-border px-2.5 py-1.5 text-[11px] text-muted transition hover:bg-hover hover:text-surface" @click="prefillPrompt('Design a modern analytics dashboard for a startup founder')">Dashboard</button>
                <button class="rounded-full border border-border px-2.5 py-1.5 text-[11px] text-muted transition hover:bg-hover hover:text-surface" @click="prefillPrompt('Turn this product idea into a mobile onboarding flow')">Mobile app</button>
              </div>
            </div>
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
          {{ debugCopied ? t('chat.copied') : t('chat.copyLog') }}
        </button>
        <button
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
          @click="handleClearChat"
        >
          <icon-lucide-trash-2 class="size-3" />
          {{ t('chat.clear') }}
        </button>
        <button
          class="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-accent hover:bg-accent/10"
          title="Create a structured spec draft from all AI responses"
          @click="handleCreateSpecFromAll"
        >
          <icon-lucide-file-plus class="size-3" />
          Create spec draft
        </button>
      </div>

      <div v-if="aiMode === 'chat-only'" class="border-t border-amber-500/20 bg-amber-500/8 px-3 py-2 text-[11px] text-amber-300">
        This provider can chat, but tool-based design actions are disabled right now.
      </div>

      <AIContextCards />

      <div
        v-if="chatError"
        class="flex items-center gap-2 border-t border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-400"
      >
        <icon-lucide-alert-circle class="size-3 shrink-0" />
        <span class="min-w-0 flex-1 truncate">{{ chatError }}</span>
        <button class="shrink-0 text-red-400 hover:text-red-300" @click="chatError = null">✕</button>
      </div>

      <ChatInput :status="status" @submit="handleSubmit" @stop="handleStop" />
    </template>
  </div>
</template>
