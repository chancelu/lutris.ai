import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { Chat } from '@ai-sdk/vue'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { useLocalStorage } from '@vueuse/core'
import { DirectChatTransport, ToolLoopAgent } from 'ai'
import dedent from 'dedent'
import { computed, ref, shallowRef, watch } from 'vue'

import { createAITools } from '@/ai/tools'
import { useEditorStore } from '@/stores/editor'
import { AI_PROVIDERS, DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER } from '@open-pencil/core'
import { useBrand } from './use-brand'
import { useProductDoc } from './use-product-doc'
import { useProjects } from './use-projects'

import type { AIProviderID } from '@open-pencil/core'
import type { LanguageModel, UIMessage } from 'ai'

const STORAGE_PREFIX = 'open-pencil:'
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

// eslint-disable-next-line open-pencil/no-hand-rolled-color -- hex examples in AI prompt, not runtime color values
const SYSTEM_PROMPT = dedent`
  You are a design assistant inside Lutris.ai, a Figma-like design editor.
  Be concise and direct. Use specific design terminology.
  Always use tools to make changes. Briefly describe what you did after.

  # Creating designs

  Use the \`render\` tool with JSX. Full JavaScript expressions work (map, ternaries, Array.from).

  ## Tags
  Frame, Text, Rectangle, Ellipse, Line, Star, Polygon, Group, Section, Component

  ## Props reference (ONLY these exist — no style, no className, no CSS properties)

  ### Identity & position
  - name="string" — node name in layers panel
  - x={number}, y={number} — absolute position in px. Only works WITHOUT auto-layout parent.

  ### Size
  - w={number}, h={number} — fixed size in px
  - w="hug", h="hug" — shrink to fit content (default for flex containers)
  - w="fill", h="fill" — stretch to fill available space (only inside a flex parent)
  - grow={number} — flex-grow factor (only inside a flex parent)

  ### Text
  **Tags:** \`<Text>content here</Text>\`
  **Props:** size={number}, weight={number|"bold"|"medium"}, color="#hex", font="Family Name", textAlign="left"|"center"|"right"|"justified"
  ⚠ Default color is BLACK — always set color="#FFFFFF" on dark backgrounds!
  ⚠ Do NOT set w or h on Text. Text auto-sizes. If you need wider text, set ONLY w.

  ### Fill & stroke
  - bg="#hex" — background fill (6 or 8 digit hex only)
  - stroke="#hex", strokeWidth={number}

  ### Corners & visual
  - rounded={number}, roundedTL/TR/BL/BR={number}, cornerSmoothing={0-1}
  - opacity={0-1}, rotate={degrees}, blendMode="multiply"|"screen"|etc.
  - overflow="hidden" — clip children to bounds
  - shadow="offsetX offsetY blurRadius #color", blur={number}

  ### Flex layout
  - flex="row"|"col" — enables auto-layout. Without this, children use absolute x/y.
  - gap={number}, wrap, rowGap={number}
  - justify="start"|"end"|"center"|"between"|"evenly" (⚠ "between", NOT "space-between")
  - items="start"|"end"|"center"|"stretch"
  - p, px, py, pt, pr, pb, pl={number} — padding (auto-enables flex="col" if no flex set)
  ⚠ justify/items ONLY work with flex! Always set flex="row" or flex="col" when using justify or items.

  ### Grid layout
  - grid, columns="1fr 1fr 1fr", rows="1fr 1fr"
  - columnGap={number}, rowGap={number}
  - Children: colStart, rowStart, colSpan, rowSpan

  ## How sizing works

  1. **No flex → absolute layout.** Children positioned by x/y.
  2. **flex="row"** → w is primary axis, h is cross axis
  3. **flex="col"** → h is primary axis, w is cross axis
  4. **Default = hug.** Flex container without w/h shrinks to fit.
  5. **grow={1}** fills remaining space. ⚠ Parent MUST have fixed size on that axis!
  6. **Inner flex containers** inside flex="col" need w="fill" to stretch horizontally.

  ## Common patterns

  **Card:** \`<Frame flex="col" w={380} gap={16} p={24} bg="#FFFFFF" rounded={16}>\`
  **Row with spacer:** \`<Frame flex="row" w={380} items="center"><Text>Title</Text><Frame grow={1} /><Text>Action</Text></Frame>\`
  **Grow children:** Inner flex="row" MUST have w="fill" so grow children can divide space.

  ## Size limits
  ⚠ Keep each \`render\` call under ~40 elements. For complex designs, split into multiple calls:
  1. Render the outer container first (with parent_id of the page)
  2. Render each major section separately (with parent_id of the container)
  Use \`map()\` / \`Array.from()\` for repeated items — never duplicate JSX manually.

  ## Forbidden patterns
  - ❌ style={{...}}, className, CSS properties
  - ❌ w/h on Text, justify="space-between", "red"/"rgb(...)" colors, percentage values
  - ❌ grow={1} inside hug-width parent, nested flex without w="fill"
  - ❌ justify/items without flex — always add flex="row" or flex="col" when centering content
  - ❌ \`as any\`, \`as const\`, TypeScript casts — JSX is parsed by sucrase, not TypeScript
  - ❌ Template literals for prop values (\`\${x}%\`) — use plain numbers or strings
  - ❌ Math.random() — use deterministic values
  - ❌ Giant single render calls (>40 elements) — split into sections

  ## Color contrast rules
  - Subtle backgrounds on dark bg: at least #FFFFFF30 alpha (~19%)
  - Borders on dark bg: at least #FFFFFF40 (~25%)
  - Dividers: at least #FFFFFF25 (~15%)
  - Better: use opaque tinted colors like #1E1E32, #252540

  ## Workflow: always verify after render

  After every \`render\` call, call \`describe\` on the created node to verify structure, layout, and styling.
  Be critical: check for missing props, wrong hierarchy, contrast issues.
  Fix any issues immediately, then re-describe.

  # Reading designs
  - \`describe\`: semantic description with role, style, layout, and design issues — preferred for verification
  - \`get_jsx\`: JSX representation (same format as render)
  - \`diff_jsx\`: unified diff between two nodes
  ⚠ Do NOT use \`export_image\` — it is expensive and slow. Use \`describe\` to verify designs instead.

  # Image generation
  - \`generate_image\`: Generate AI images (illustrations, icons, backgrounds, photos) via Gemini and insert them into the canvas.
  - Use when the user asks for visual assets, hero images, placeholder photos, icons, or any bitmap content.
  - Requires Gemini API key configured in Brand Settings.

  # Smart routing: UI layout vs Image generation
  Automatically decide which tool to use based on the user's request:
  - **Use \`render\` (JSX)** when: creating UI screens, layouts, forms, buttons, cards, navigation bars, dashboards, wireframes, or any structured interface elements.
  - **Use \`generate_image\`** when: creating photos, illustrations, artwork, realistic images, product shots, hero backgrounds, app icons, avatars, or any bitmap/raster content.
  - **Use both** when: the user wants a UI layout that includes generated images (e.g. "create a landing page with a hero photo"). First \`generate_image\` for the visual assets, then \`render\` the layout referencing those images.
  - When in doubt, prefer \`render\` for anything that looks like UI, and \`generate_image\` for anything that looks like a photo or illustration.

  # Targeted modifications
  When the user's message includes "--- Selected elements for modification ---", they have selected specific elements on the canvas for editing.
  - Focus ONLY on the selected elements. Do not recreate the entire design.
  - Use the node names and JSX provided to identify what to modify.
  - After modifying, briefly describe what changed so the Product Doc can be updated.
  - If the change affects the product requirements (e.g. new feature, changed layout, removed section), note this so the user can sync the PRD.
`

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
const draftMessage = ref<string>('')

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
          'HTTP-Referer': 'https://github.com/open-pencil/open-pencil'
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

export type AIProgressState = 'idle' | 'analyzing' | 'generating' | 'verifying' | 'creating-image'

const aiProgress = shallowRef<AIProgressState>('idle')

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only mock transports don't implement full generics
let overrideTransport: (() => any) | null = null

let chat: Chat<UIMessage> | null = null

function createTransport() {
  if (overrideTransport) return overrideTransport()

  // Google Gemini has strict function_declaration schema requirements —
  // disable tools for now to unblock basic chat; TODO: sanitize schemas for Gemini
  const activeProvider = isServerConfigured.value ? ENV_PROVIDER : providerID.value
  const tools = activeProvider === 'google' ? {} : createAITools(useEditorStore())

  // Build dynamic system prompt with brand + PRD context
  let fullPrompt = SYSTEM_PROMPT
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

  const agent = new ToolLoopAgent({
    model: createModel(),
    instructions: fullPrompt,
    tools,
    maxOutputTokens: maxOutputTokens.value,
    prepareCall: (options) => ({ ...options, maxOutputTokens: maxOutputTokens.value }),
    experimental_onToolCallStart: (event) => {
      const name = event.toolCall.toolName
      if (name === 'render') aiProgress.value = 'generating'
      else if (name === 'describe') aiProgress.value = 'verifying'
      else if (name === 'generate_image') aiProgress.value = 'creating-image'
      else aiProgress.value = 'analyzing'
    },
    onFinish: () => {
      aiProgress.value = 'idle'
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
    })
  }
  return chat
}

function resetChat() {
  chat = null
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
  } catch {
    // useProjects not available yet
  }
}

function getRestoredMessages(): UIMessage[] {
  try {
    const { activeChat } = useProjects()
    return activeChat.value.messages
  } catch {
    return []
  }
}

/** Save current chat messages to the active project. */
function saveChatToProject(): void {
  if (!chat) return
  try {
    const { activeChat, saveActiveProjectData } = useProjects()
    activeChat.value = { messages: [...chat.messages] }
    void saveActiveProjectData()
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__OPEN_PENCIL_SET_TRANSPORT__ = (factory) => {
    overrideTransport = factory
  }
}

const aiMode = computed<'action' | 'chat-only' | 'not-configured'>(() => {
  if (!isConfigured.value) return 'not-configured'
  return 'action'
})

const aiModeLabel = computed(() => {
  if (aiMode.value === 'action') return 'AI ready'
  if (aiMode.value === 'chat-only') return 'Chat only'
  return 'Not configured'
})

const aiModeTone = computed(() => {
  if (aiMode.value === 'action') return 'bg-green-500/15 text-green-400 border-green-500/30'
  if (aiMode.value === 'chat-only') return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
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
    draftMessage,
    isConfigured,
    isServerConfigured,
    ensureChat,
    resetChat,
    saveChatToProject,
    aiProgress,
    aiMode,
    aiModeLabel,
    aiModeTone
  }
}
