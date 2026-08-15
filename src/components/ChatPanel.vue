<script setup lang="ts">
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { computed, nextTick, ref, watch } from 'vue'

import { copyChatLog } from '@/ai/chat-debug'
import ChatInput from '@/components/chat/ChatInput.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import IdeaBriefCard from '@/components/chat/IdeaBriefCard.vue'
import ProviderSetup from '@/components/chat/ProviderSetup.vue'
import AIContextCards from '@/components/AIContextCards.vue'
import NextStepCard from '@/components/NextStepCard.vue'
import { useAIChat } from '@/composables/use-chat'
import { useAISelect } from '@/composables/use-ai-select'
import { usePipeline } from '@/composables/use-pipeline'
import { useEditorStore } from '@/stores/editor'
import { AI_PROVIDERS } from '@llc3233149/core'

const IS_DEV = import.meta.env.DEV

const editorStore = useEditorStore()
const hasCanvasContent = computed(() => {
  const page = editorStore.graph.nodes.get(editorStore.state.currentPageId)
  return (page?.childIds?.length ?? 0) > 0
})
// Idea/Spec phase agents have no canvas tools — offering "analyze imported design"
// there dead-ends. Only show it once the agent can actually inspect the canvas.
const { currentPhase } = usePipeline()
const canAnalyzeCanvas = computed(() => currentPhase.value === 'design' || currentPhase.value === 'dev')

const { isConfigured, ensureChat, resetChat, pendingMessage, pendingSystemPrefix, aiProgress, providerID, isServerConfigured, saveChatToProject, chatInstanceVersion } = useAIChat()
const { hasContext, buildContextPrompt, clearAIContext } = useAISelect()

// 单一事实源：始终从 use-chat 模块态取实例（chatInstanceVersion 变化时重取）。
// 之前本地 ref 缓存旧实例——项目切换后 UI 聊的是一个 Chat、IDB 保存的是另一个，
// 导致聊天记录永远写不进 IDB，刷新即丢。
const chat = computed(() => {
  void chatInstanceVersion.value
  void isConfigured.value
  return ensureChat()
})
const messagesEnd = ref<HTMLDivElement>()
const debugCopied = ref(false)
const chatError = ref<string | null>(null)
const lastUserMessage = ref<string | null>(null)

const messages = computed(() => chat.value?.messages ?? [])
const status = computed(() => chat.value?.status ?? 'ready')
const chatSdkError = computed(() => chat.value?.error)

/** AI SDK 有时把真实原因包在 cause 链里（顶层只是 "An error occurred."）——挖到底层 */
function rootErrorMessage(err: unknown): string {
  let cur = err as { message?: string; cause?: unknown } | null
  let msg = cur?.message ?? String(err)
  for (let depth = 0; cur?.cause && depth < 3; depth++) {
    cur = cur.cause as typeof cur
    if (cur?.message) msg = cur.message
  }
  return msg
}

watch(chatSdkError, (err) => {
  if (err) {
    console.error('[AI Chat] SDK error:', err)
    // Detect CORS / network errors and provide actionable guidance
    const msg = rootErrorMessage(err)
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS')) {
      chatError.value = '网络错误——如果是直连 Anthropic，其 API 会拦截浏览器跨域请求（CORS）。请改用 OpenRouter 或代理。'
    } else {
      const providerName = providerDef.value?.name ?? 'AI provider'
      chatError.value = `${providerName} 请求失败：${msg}`
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

  const contextSuffix = hasContext.value ? buildContextPrompt() : ''
  const fullText = (systemPrefix ?? '') + text + contextSuffix
  chatError.value = null
  const instance = chat.value ?? ensureChat()
  if (!instance) return // 项目数据加载中/未配置 provider——稍候重试
  instance.sendMessage({ text: fullText }).catch((err) => {
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

// Idea 阶段用户侧推进：让 AI 立即收尾——提交 Idea Brief 并接着拆 Spec。
// 走正常对话通道，AI 的 submit_idea_brief 工具完成真正的 advancePhase。
function finishIdea() {
  handleSubmit(
    '我们已经聊清楚了。请立即调用 submit_idea_brief 提交目前确认的产品定位（summary / targetUsers / problem，如有待定决策列入 keyDecisions），然后继续把 Spec 页面结构拆解出来。'
  )
}

async function handleCopyDebug() {
  await copyChatLog(messages.value)
  debugCopied.value = true
  setTimeout(() => {
    debugCopied.value = false
  }, 1500)
}

function handleClearChat() {
  resetChat()
}

/** 打开聊天输入区里的 provider 设置弹层（与 TopBar 菜单同一个入口） */
function openProviderSettings() {
  document
    .querySelector<HTMLElement>('[data-test-id="provider-settings-trigger"]')
    ?.click()
}
</script>

<template>
  <div data-test-id="chat-panel" class="flex min-w-0 flex-1 flex-col overflow-hidden select-text">
    <ProviderSetup v-if="!isConfigured" />

    <template v-else>
      <!-- 已确认的产品定位摘要：流程走出 idea 阶段后常驻聊天面板顶部 -->
      <IdeaBriefCard />
      <ScrollAreaRoot class="min-h-0 flex-1">
        <ScrollAreaViewport class="h-full px-3 py-3 [&>div]:h-full">
          <div
            v-if="messages.length === 0"
            data-test-id="chat-empty-state"
            class="flex h-full flex-col items-center justify-center px-6 py-8"
          >
            <template v-if="currentPhase === 'idea'">
              <p class="text-[10px] font-medium uppercase tracking-[0.24em] text-accent/70">Idea</p>
              <p class="font-display mt-3 text-center text-[19px] leading-snug text-surface/90">说说你的想法</p>
              <p class="mt-2 text-center text-[11px] leading-relaxed text-muted/70">几句话就够——我来帮你拆需求、出设计、写代码</p>
            </template>
            <template v-else>
              <p class="font-display text-center text-[17px] leading-snug text-surface/90">想做点什么？</p>
              <p class="mt-2 text-center text-[11px] text-muted/70">描述一个页面、组件或布局</p>
            </template>
            <button
              v-if="hasCanvasContent && canAnalyzeCanvas"
              class="mt-4 flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/5 px-3.5 py-1.5 text-[12px] text-accent transition hover:bg-accent/10"
              @click="handleSubmit('Analyze the imported design and create a product spec')"
            >
              <icon-lucide-scan-search class="size-3.5" />
              分析导入的设计稿
            </button>
          </div>

          <div v-else data-test-id="chat-messages" class="flex flex-col gap-3">
            <ChatMessage
              v-for="msg in messages"
              :key="msg.id"
              :message="msg"
            />

            <!-- Guided-loop: phase-complete card with the single next action -->
            <NextStepCard />

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

      <div v-if="messages.length > 0" class="flex shrink-0 items-center gap-1 border-t border-border/30 px-3 py-1">
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
      </div>

      <AIContextCards />

      <!-- Idea 阶段的用户侧出口：聊得差不多时不必等 AI 判断"信息够了"，
           一键让 AI 立即总结并提交 Idea Brief、接着生成 Spec 初稿 -->
      <div
        v-if="currentPhase === 'idea' && messages.length > 0 && status === 'ready'"
        class="flex shrink-0 items-center gap-2 border-t border-border/30 px-3 py-1.5"
      >
        <p class="min-w-0 flex-1 text-[11px] text-muted">聊得差不多了？</p>
        <button
          data-test-id="idea-finish"
          class="gradient-cta shrink-0 rounded-full px-3 py-1 text-[11px] font-medium text-on-accent transition-[filter] hover:brightness-110"
          @click="finishIdea"
        >
          总结想法，生成 Spec →
        </button>
      </div>

      <div
        v-if="chatError"
        class="flex items-center gap-2 border-t border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-400"
      >
        <icon-lucide-alert-circle class="size-3 shrink-0" />
        <span class="min-w-0 flex-1" :class="chatError.length > 80 ? '' : 'truncate'">{{ chatError }}</span>
        <button
          class="shrink-0 rounded px-1.5 py-0.5 text-red-400 transition hover:bg-red-500/15 hover:text-red-300"
          @click="openProviderSettings"
        >
          检查设置
        </button>
        <button
          v-if="lastUserMessage"
          class="shrink-0 rounded px-1.5 py-0.5 text-red-400 transition hover:bg-red-500/15 hover:text-red-300"
          @click="chatError = null; handleSubmit(lastUserMessage!)"
        >
          重试
        </button>
        <button class="shrink-0 text-red-400 hover:text-red-300" @click="chatError = null">✕</button>
      </div>

      <ChatInput :status="status" @submit="handleSubmit" @stop="handleStop" />
    </template>
  </div>
</template>
