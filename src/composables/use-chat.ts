import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { Chat } from '@ai-sdk/vue'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { useLocalStorage } from '@vueuse/core'
import { DirectChatTransport, ToolLoopAgent } from 'ai'
import { computed, ref, shallowRef, watch } from 'vue'

import { createSubmitTools, filterToolsByPhase } from '@/ai/phase-tools'
import { DESIGN_PROMPT, DEV_PROMPT, IDEA_PROMPT, SPEC_PROMPT } from '@/ai/prompts'
import { createAITools } from '@/ai/tools'
import { useEditorStore } from '@/stores/editor'
import { AI_PROVIDERS, DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER } from '@llc3233149/core'
import { useBrand } from './use-brand'
import { usePipeline } from './use-pipeline'
import { useProductDoc } from './use-product-doc'
import { useProjects } from './use-projects'

import type { PipelinePhase } from '@/types/pipeline'
import type { AIProviderID } from '@llc3233149/core'
import type { LanguageModel, UIMessage } from 'ai'

const STORAGE_PREFIX = 'lutris:'
const LEGACY_KEY_STORAGE = `${STORAGE_PREFIX}openrouter-api-key`

function keyStorageKey(id: string) {
  return `${STORAGE_PREFIX}ai-key:${id}`
}

function migrateLegacyStorage() {
  const legacyKey = localStorage.getItem(LEGACY_KEY_STORAGE)
  if (legacyKey) {
    localStorage.setItem(keyStorageKey('openrouter'), legacyKey)
    localStorage.removeItem(LEGACY_KEY_STORAGE)
    if (!localStorage.getItem(`${STORAGE_PREFIX}ai-provider`)) {
      localStorage.setItem(`${STORAGE_PREFIX}ai-provider`, 'openrouter')
    }
  }
}

if (typeof window !== 'undefined') migrateLegacyStorage()

/**
 * Task 10: 巨型 SYSTEM_PROMPT 已按 pipeline phase 拆分到 @/ai/prompts.ts
 * （IDEA_PROMPT / SPEC_PROMPT / DESIGN_PROMPT / DEV_PROMPT）。
 * pickPhasePrompt() 按 usePipeline().currentPhase 选取对应段落。
 */
function pickPhasePrompt(phase: PipelinePhase): string {
  switch (phase) {
    case 'idea': return IDEA_PROMPT
    case 'spec': return SPEC_PROMPT
    case 'design': return DESIGN_PROMPT
    case 'dev': return DEV_PROMPT
    default: return DESIGN_PROMPT
  }
}


// ── Environment variable defaults ──
const ENV_PROVIDER = import.meta.env.VITE_AI_PROVIDER as AIProviderID | undefined
const ENV_API_KEY = (import.meta.env.VITE_AI_API_KEY ?? '') as string
const ENV_BASE_URL = (import.meta.env.VITE_AI_BASE_URL ?? '') as string
const ENV_MODEL = (import.meta.env.VITE_AI_MODEL ?? '') as string
const ENV_API_TYPE = (import.meta.env.VITE_AI_API_TYPE ?? 'completions') as 'completions' | 'responses'

const providerID = useLocalStorage<AIProviderID>(
  `${STORAGE_PREFIX}ai-provider`,
  ENV_PROVIDER ?? DEFAULT_AI_PROVIDER
)
const apiKeyStorageKey = computed(() => keyStorageKey(providerID.value))
const apiKey = useLocalStorage(apiKeyStorageKey, ENV_API_KEY)
const modelID = useLocalStorage(`${STORAGE_PREFIX}ai-model`, DEFAULT_AI_MODEL)
const customBaseURL = useLocalStorage(`${STORAGE_PREFIX}ai-base-url`, ENV_BASE_URL)
const customModelID = useLocalStorage(`${STORAGE_PREFIX}ai-custom-model`, ENV_MODEL)
const customAPIType = useLocalStorage<'completions' | 'responses'>(
  `${STORAGE_PREFIX}ai-api-type`,
  ENV_API_TYPE
)
const maxOutputTokens = useLocalStorage(`${STORAGE_PREFIX}ai-max-output-tokens`, 16384)

// ── Env override: env vars take priority over stale localStorage ──
if (ENV_PROVIDER !== undefined) providerID.value = ENV_PROVIDER
if (ENV_API_KEY !== '') apiKey.value = ENV_API_KEY
if (ENV_BASE_URL !== '') customBaseURL.value = ENV_BASE_URL
if (ENV_MODEL !== '') customModelID.value = ENV_MODEL
if (ENV_API_TYPE !== '' as string) customAPIType.value = ENV_API_TYPE

const activeTab = ref<'create' | 'spec' | 'ship'>('create')
const pendingMessage = ref<string | null>(null)
const pendingSystemPrefix = ref<string | null>(null)
const draftMessage = ref<string>('')
const focusRequested = ref(0)
const inlinePanel = ref<'spec' | 'export' | null>(null)
// Bumped when chat instance is re-created (e.g. after IDB restore) so ChatPanel can react
const chatInstanceVersion = ref(0)

const providerDef = computed(
  () => AI_PROVIDERS.find((p) => p.id === providerID.value) ?? AI_PROVIDERS[0]
)

// Server-configured: env vars provide everything, skip user setup entirely
const isServerConfigured = computed(() => {
  if (!ENV_API_KEY || !ENV_PROVIDER) return false
  const needsBaseURL = ENV_PROVIDER === 'openai-compatible' || ENV_PROVIDER === 'anthropic-compatible'
  if (needsBaseURL && !ENV_BASE_URL) return false
  return true
})

const isConfigured = computed(() => {
  if (isServerConfigured.value) return true
  if (!apiKey.value) return false
  const needsBaseURL =
    providerID.value === 'openai-compatible' || providerID.value === 'anthropic-compatible'
  if (needsBaseURL && !customBaseURL.value) return false
  return true
})

// Task 10: phase 变了，工具白名单和 system prompt 都变了，
// 必须重建 transport（跟切换 provider 一样的模式）
watch(() => usePipeline().currentPhase.value, () => resetChat())

watch(providerID, (id) => {
  const def = AI_PROVIDERS.find((p) => p.id === id)
  if (def?.defaultModel) {
    modelID.value = def.defaultModel
  }
  resetChat()
})

watch(modelID, () => resetChat())
watch(customModelID, () => resetChat())
watch(customAPIType, () => resetChat())

function setAPIKey(key: string) {
  apiKey.value = key
}

function getModelConfig() {
  const isEnv = !!(ENV_PROVIDER && ENV_API_KEY)
  const key = isEnv ? ENV_API_KEY : apiKey.value
  const activeProvider = isEnv ? ENV_PROVIDER : providerID.value
  const needsCustomModel =
    activeProvider === 'openai-compatible' || activeProvider === 'anthropic-compatible'
  const effectiveModelID = isEnv && ENV_MODEL
    ? ENV_MODEL
    : (needsCustomModel ? customModelID.value : modelID.value)
  const effectiveBaseURL = isEnv && ENV_BASE_URL ? ENV_BASE_URL : customBaseURL.value
  const effectiveAPIType = isEnv ? ENV_API_TYPE : customAPIType.value

  return {
    key,
    activeProvider,
    effectiveModelID,
    effectiveBaseURL,
    effectiveAPIType,
  }
}

function createModel(): LanguageModel {
  const { key, activeProvider, effectiveModelID, effectiveBaseURL, effectiveAPIType } = getModelConfig()

  switch (activeProvider) {
    case 'openrouter': {
      const openrouter = createOpenRouter({
        apiKey: key,
        headers: {
          'X-OpenRouter-Title': 'Lutris.ai',
          'HTTP-Referer': 'https://github.com/chancelu/lutris.ai'
        }
      })
      return openrouter(effectiveModelID)
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey: key })
      return anthropic(effectiveModelID)
    }
    case 'openai': {
      const openai = createOpenAI({ apiKey: key })
      return openai(effectiveModelID)
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey: key })
      return google(effectiveModelID)
    }
    case 'zai': {
      const zai = createOpenAI({
        apiKey: key,
        baseURL: 'https://api.z.ai/api/paas/v4'
      })
      return zai.chat(effectiveModelID)
    }
    case 'minimax': {
      const minimax = createOpenAI({
        apiKey: key,
        baseURL: 'https://api.minimax.io/v1'
      })
      return minimax.chat(effectiveModelID)
    }
    case 'openai-compatible': {
      const custom = createOpenAI({
        apiKey: key,
        baseURL: effectiveBaseURL
      })
      return effectiveAPIType === 'responses'
        ? custom.responses(effectiveModelID)
        : custom.chat(effectiveModelID)
    }
    case 'anthropic-compatible': {
      const custom = createAnthropic({
        apiKey: key,
        baseURL: effectiveBaseURL
      })
      return custom(effectiveModelID)
    }
    default: {
      // Fallback: treat any unknown provider as openai-compatible
      const fallback = createOpenAI({
        apiKey: key,
        baseURL: effectiveBaseURL || undefined
      })
      return effectiveAPIType === 'responses'
        ? fallback.responses(effectiveModelID)
        : fallback.chat(effectiveModelID)
    }
  }
}

export type AIProgressState = 'idle' | 'analyzing' | 'generating' | 'verifying' | 'creating-image' | 'generating-design' | 'importing'

const aiProgress = shallowRef<AIProgressState>('idle')

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only mock transports don't implement full generics
let overrideTransport: (() => any) | null = null

let chat: Chat<UIMessage> | null = null

function buildDynamicPrompt(): string {
  const { currentPhase } = usePipeline()
  let fullPrompt = pickPhasePrompt(currentPhase.value)
  try {
    const { getBrandSystemPrompt, hasBrand } = useBrand()
    if (hasBrand.value) {
      fullPrompt += '\n\n' + getBrandSystemPrompt()
    }
  } catch { /* brand composable not available */ }

  try {
    const { currentContent, hasContent } = useProductDoc()
    if (hasContent.value) {
      const summary = currentContent.value.slice(0, 2000)
      fullPrompt += `\n\n## Product Requirements Context\nThe current PRD summary:\n${summary}`
    }
  } catch { /* product doc composable not available */ }

  // Canvas context: what's already on the page
  try {
    const store = useEditorStore()
    const page = store.graph.getNode(store.state.currentPageId)
    const childIds = page?.childIds || []
    if (childIds.length > 0) {
      const summary = childIds.slice(0, 20).map((id: string) => {
        const n = store.graph.getNode(id)
        return n ? `- ${n.name} (${n.type}, ${Math.round(n.width || 0)}×${Math.round(n.height || 0)})` : null
      }).filter(Boolean).join('\n')
      fullPrompt += `\n\n## Current Canvas\n${childIds.length} top-level elements:\n${summary}`
      if (childIds.length > 20) fullPrompt += `\n... and ${childIds.length - 20} more`
    }
  } catch { /* store not available */ }

  return fullPrompt
}

function createTransport() {
  if (overrideTransport) return overrideTransport()

  const { currentPhase } = usePipeline()
  const { tools: allTools, commitAIBatch } = createAITools(useEditorStore())
  const tools = {
    ...filterToolsByPhase(allTools, currentPhase.value),
    ...createSubmitTools(currentPhase.value),
  }

  const agent = new ToolLoopAgent({
    model: createModel(),
    instructions: buildDynamicPrompt(),
    tools,
    maxOutputTokens: maxOutputTokens.value,
    prepareCall: (options) => ({
      ...options,
      maxOutputTokens: maxOutputTokens.value,
      instructions: buildDynamicPrompt(),
    }),
    experimental_onToolCallStart: (event) => {
      const name = event.toolCall.toolName
      if (name === 'render') aiProgress.value = 'generating'
      else if (name === 'describe') aiProgress.value = 'verifying'
      else if (name === 'generate_image') aiProgress.value = 'creating-image'
      else aiProgress.value = 'analyzing'
    },
    onFinish: () => {
      commitAIBatch()
      aiProgress.value = 'idle'
      saveChatToProject()
    }
  })

  return new DirectChatTransport({ agent })
}

function ensureChat(): Chat<UIMessage> | null {
  if (!isConfigured.value) return null
  if (!chat) {
    const restored = getRestoredMessages()
    chat = new Chat<UIMessage>({
      transport: createTransport(),
      ...(restored.length > 0 ? { initialMessages: restored } : {}),
      onError: () => {
        aiProgress.value = 'idle'
      },
    })
  }
  return chat
}

function resetChat() {
  if (chat) {
    chat.stop().catch(() => { /* ignore abort errors */ })
  }
  chat = null
  aiProgress.value = 'idle'
}

// ── Per-Project Chat Persistence ──
// Save chat messages to project data on project switch, restore on load.

let _chatProjectWatchInit = false

function initChatProjectWatch(): void {
  if (_chatProjectWatchInit) return
  _chatProjectWatchInit = true

  try {
    const { activeProjectId, activeChat, saveActiveProjectData } = useProjects()

    watch(() => activeProjectId.value, (_newId, oldId) => {
      // Save current chat messages to old project
      if (oldId && chat) {
        activeChat.value = { messages: [...chat.messages] }
        void saveActiveProjectData()
      }

      // Reset chat for new project
      resetChat()

      // Restore messages will happen when ensureChat is called
      // and the chat is initialized with restored messages
    })

    // When IDB finishes loading and activeChat gets populated after chat was
    // already created with empty messages, re-create chat with restored messages.
    watch(() => activeChat.value.messages.length, (newLen) => {
      if (newLen > 0) {
        // Case 1: chat exists but has no messages (created before IDB loaded)
        if (chat && chat.messages.length === 0) {
          const restored = getRestoredMessages()
          if (restored.length > 0) {
            resetChat()
            chat = new Chat<UIMessage>({
              transport: createTransport(),
              initialMessages: restored,
              onError: () => { aiProgress.value = 'idle' },
            })
            chatInstanceVersion.value++
          }
        }
        // Case 2: chat is null (resetChat was called during project switch)
        // Just bump version so ChatPanel calls ensureChat() which will pick up the data
        if (!chat) {
          chatInstanceVersion.value++
        }
      }
    })

    // Persist chat on page unload so messages survive refresh
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        syncChatToProject()
        // Synchronous localStorage write as fallback — IDB is async and may not
        // complete before the page unloads
        const pid = activeProjectId.value
        if (pid && chat) {
          try {
            const data = JSON.stringify({ messages: chat.messages })
            localStorage.setItem(`${STORAGE_PREFIX}chat-backup:${pid}`, data)
          } catch {
            // localStorage full or unavailable — best effort
          }
        }
        void saveActiveProjectData()
      })
    }
  } catch {
    // useProjects not available yet
  }
}

function getRestoredMessages(): UIMessage[] {
  try {
    const { activeChat, activeProjectId } = useProjects()
    let messages = activeChat.value.messages

    // If IDB had no messages, try localStorage backup (written synchronously on beforeunload)
    if ((!messages || messages.length === 0) && activeProjectId.value) {
      const backup = localStorage.getItem(`${STORAGE_PREFIX}chat-backup:${activeProjectId.value}`)
      if (backup) {
        try {
          const parsed = JSON.parse(backup)
          if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            messages = parsed.messages
            // Restore into activeChat so IDB gets updated on next save
            activeChat.value = { messages }
          }
        } catch {
          // corrupt backup — ignore
        }
        // Clean up backup after successful restore
        localStorage.removeItem(`${STORAGE_PREFIX}chat-backup:${activeProjectId.value}`)
      }
    }
    // Filter out incomplete tool calls that would show permanent spinners
    return messages.map((msg: UIMessage) => ({
      ...msg,
      parts: msg.parts.filter((part) => {
        if ('type' in part && part.type === 'tool-invocation') {
          const status = (part as { state?: string }).state
          return status !== 'partial-call'
        }
        return true
      }),
    }))
  } catch {
    return []
  }
}

/** Sync current chat messages to the active project ref (no IDB write). */
function syncChatToProject(): void {
  if (!chat) return
  try {
    const { activeChat } = useProjects()
    activeChat.value = { messages: [...chat.messages] }
  } catch {
    // ignore
  }
}

/** Save current chat messages to the active project and persist to IDB. */
function saveChatToProject(): void {
  if (!chat) return
  try {
    const { activeChat, activeProjectId, saveActiveProjectData } = useProjects()
    activeChat.value = { messages: [...chat.messages] }
    // Also write to localStorage as synchronous backup
    const pid = activeProjectId.value
    if (pid && chat.messages.length > 0) {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}chat-backup:${pid}`, JSON.stringify({ messages: chat.messages }))
      } catch { /* best effort */ }
    }
    void saveActiveProjectData().then(() => {
      if (activeProjectId.value) {
        localStorage.removeItem(`${STORAGE_PREFIX}chat-backup:${activeProjectId.value}`)
      }
    })
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__OPEN_PENCIL_SET_TRANSPORT__ = (factory) => {
    overrideTransport = factory
  }
}

const isGenerating = computed(() => aiProgress.value !== 'idle')

const aiMode = computed<'action' | 'not-configured'>(() => {
  if (!isConfigured.value) return 'not-configured'
  return 'action'
})

const aiModeLabel = computed(() => {
  if (aiMode.value === 'action') return 'AI ready'
  return 'Not configured'
})

const aiModeTone = computed(() => {
  if (aiMode.value === 'action') return 'bg-green-500/15 text-green-400 border-green-500/30'
  return 'bg-red-500/15 text-red-400 border-red-500/30'
})

export function useAIChat() {
  // Initialize project watch on first use
  initChatProjectWatch()

  return {
    providerID,
    providerDef,
    apiKey,
    setAPIKey,
    modelID,
    customBaseURL,
    customModelID,
    customAPIType,
    maxOutputTokens,
    activeTab,
    pendingMessage,
    pendingSystemPrefix,
    draftMessage,
    isConfigured,
    isServerConfigured,
    ensureChat,
    resetChat,
    saveChatToProject,
    syncChatToProject,
    aiProgress,
    aiMode,
    aiModeLabel,
    aiModeTone,
    isGenerating,
    focusRequested,
    inlinePanel,
    chatInstanceVersion,
  }
}
