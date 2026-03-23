<script setup lang="ts">
import { computed, ref } from 'vue'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { useFigmaMCP } from '@/composables/use-figma-mcp'

const {
  status,
  error,
  userName,
  isLoading,
  lastDesignContext,
  lastVariables,
  connect,
  disconnect,
  getDesignContext,
  getVariables,
  getScreenshot,
  pushToFigma,
} = useFigmaMCP()

const figmaUrl = ref('')
const framework = ref<'react' | 'vue' | 'html'>('react')
const previewImage = ref<string | null>(null)
const pushResult = ref<string | null>(null)
const activeSection = ref<'import' | 'export' | 'tokens'>('import')

async function handleImport() {
  if (!figmaUrl.value) return
  await getDesignContext(figmaUrl.value, framework.value)
}

async function handlePreview() {
  if (!figmaUrl.value) return
  previewImage.value = await getScreenshot(figmaUrl.value)
}

async function handleGetTokens() {
  if (!figmaUrl.value) return
  await getVariables(figmaUrl.value)
}

async function handlePush() {
  if (!figmaUrl.value) return
  // TODO: get current selection as HTML from the editor
  const html = lastDesignContext.value?.code ?? '<div>No content to push</div>'
  pushResult.value = await pushToFigma(figmaUrl.value, html)
}

const isMac = navigator.platform.includes('Mac')
const copyShortcut = computed(() => isMac ? '⌘L' : 'Ctrl+L')

const FRAMEWORKS = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'html', label: 'HTML' },
] as const
</script>

<template>
  <div data-test-id="figma-bridge-panel" class="flex min-h-0 flex-1 flex-col">
    <!-- Connection status bar -->
    <div class="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      <div
        class="size-2 rounded-full"
        :class="{
          'bg-green-400': status === 'connected',
          'bg-yellow-400 animate-pulse': status === 'connecting' || status === 'authenticating',
          'bg-red-400': status === 'error',
          'bg-zinc-500': status === 'disconnected',
        }"
      />
      <span class="flex-1 truncate text-[12px] text-muted">
        <template v-if="status === 'connected'">{{ userName ?? 'Connected' }}</template>
        <template v-else-if="status === 'connecting'">Connecting...</template>
        <template v-else-if="status === 'authenticating'">Authenticating...</template>
        <template v-else-if="status === 'error'">{{ error || 'Error' }}</template>
        <template v-else>Not connected</template>
      </span>
      <button
        v-if="status === 'connected'"
        class="rounded px-2 py-0.5 text-[12px] text-muted hover:bg-hover hover:text-surface"
        @click="disconnect"
      >
        Disconnect
      </button>
    </div>

    <!-- Setup guide (when not connected) -->
    <div v-if="status !== 'connected'" class="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <icon-lucide-link class="size-8 text-muted/40" />
      <div>
        <p class="text-[13px] font-medium text-surface">Figma Integration</p>
        <p class="mt-1 text-[12px] text-muted leading-relaxed">
          Connect to Figma to import designs, sync tokens, and push changes.
        </p>
      </div>
      <div class="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-left">
        <p class="text-[11px] font-medium text-amber-400">Setup required</p>
        <ol class="mt-1.5 list-inside list-decimal text-[11px] text-muted leading-relaxed">
          <li>Register an app at <a href="https://www.figma.com/developers" target="_blank" class="text-accent hover:underline">figma.com/developers</a></li>
          <li>Set redirect URI to your app URL</li>
          <li>Add your Client ID in settings</li>
        </ol>
      </div>
      <button
        class="rounded bg-blue-600 px-3 py-1.5 text-[12px] text-white hover:bg-blue-500"
        @click="connect"
      >
        Try Connect
      </button>
    </div>

    <!-- Main content (requires connection) -->
    <template v-if="status === 'connected'">
      <!-- Figma URL input -->
      <div class="shrink-0 border-b border-border px-3 py-2">
        <input
          v-model="figmaUrl"
          type="text"
          :placeholder="`Paste Figma link (${copyShortcut} to copy from Figma)`"
          class="w-full rounded border border-border bg-transparent px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <!-- Section tabs -->
      <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
        <button
          v-for="sec in (['import', 'export', 'tokens'] as const)"
          :key="sec"
          class="rounded px-2 py-0.5 text-[12px] capitalize"
          :class="activeSection === sec ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
          @click="activeSection = sec"
        >
          {{ sec === 'import' ? '📥 Import' : sec === 'export' ? '📤 Export' : '🎨 Tokens' }}
        </button>
      </div>

      <ScrollAreaRoot class="min-h-0 flex-1">
        <ScrollAreaViewport class="size-full">
          <!-- Import section -->
          <div v-if="activeSection === 'import'" class="p-3">
            <div class="mb-3 flex items-center gap-1.5">
              <span class="text-[12px] text-muted">Framework:</span>
              <button
                v-for="fw in FRAMEWORKS"
                :key="fw.value"
                class="rounded px-1.5 py-0.5 text-[12px]"
                :class="framework === fw.value ? 'bg-blue-600 text-white' : 'text-muted hover:bg-hover hover:text-surface'"
                @click="framework = fw.value"
              >
                {{ fw.label }}
              </button>
            </div>

            <div class="flex gap-1.5">
              <button
                :disabled="!figmaUrl || isLoading"
                class="flex-1 rounded bg-blue-600 px-2 py-1 text-[12px] text-white hover:bg-blue-500 disabled:opacity-40"
                @click="handleImport"
              >
                {{ isLoading ? 'Loading...' : 'Import Design' }}
              </button>
              <button
                :disabled="!figmaUrl || isLoading"
                class="rounded border border-border px-2 py-1 text-[12px] text-muted hover:bg-hover hover:text-surface disabled:opacity-40"
                @click="handlePreview"
              >
                Preview
              </button>
            </div>

            <!-- Preview image -->
            <div v-if="previewImage" class="mt-3 overflow-hidden rounded border border-border">
              <img :src="previewImage" alt="Figma preview" class="w-full" />
            </div>

            <!-- Imported code -->
            <div v-if="lastDesignContext" class="mt-3">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-[12px] font-semibold text-surface">Generated Code</span>
                <span class="text-[11px] text-muted">{{ lastDesignContext.framework }}</span>
              </div>
              <pre class="max-h-60 overflow-auto rounded bg-inset p-2 text-[12px] text-green-300"><code>{{ lastDesignContext.code }}</code></pre>
            </div>
          </div>

          <!-- Export section -->
          <div v-if="activeSection === 'export'" class="p-3">
            <p class="mb-3 text-[12px] text-muted">
              Push your current design back to Figma as editable layers.
            </p>
            <button
              :disabled="!figmaUrl || isLoading"
              class="w-full rounded bg-purple-600 px-2 py-1.5 text-[12px] text-white hover:bg-purple-500 disabled:opacity-40"
              @click="handlePush"
            >
              {{ isLoading ? 'Pushing...' : '🚀 Push to Figma' }}
            </button>
            <div v-if="pushResult" class="mt-3 rounded bg-green-500/10 p-2">
              <span class="text-[12px] text-green-400">{{ pushResult }}</span>
            </div>
          </div>

          <!-- Tokens section -->
          <div v-if="activeSection === 'tokens'" class="p-3">
            <button
              :disabled="!figmaUrl || isLoading"
              class="mb-3 w-full rounded bg-amber-600 px-2 py-1.5 text-[12px] text-white hover:bg-amber-500 disabled:opacity-40"
              @click="handleGetTokens"
            >
              {{ isLoading ? 'Loading...' : '🎨 Sync Tokens from Figma' }}
            </button>

            <div v-if="lastVariables.length > 0">
              <div class="mb-1 text-[12px] font-semibold text-surface">
                {{ lastVariables.length }} tokens
              </div>
              <div
                v-for="v in lastVariables"
                :key="v.name"
                class="flex items-center justify-between border-b border-border/50 py-1"
              >
                <div class="flex flex-col">
                  <span class="font-mono text-[12px] text-surface">{{ v.name }}</span>
                  <span v-if="v.collection" class="text-[11px] text-muted">{{ v.collection }}</span>
                </div>
                <span class="font-mono text-[12px] text-muted">{{ v.value }}</span>
              </div>
            </div>
            <div v-else class="text-[12px] text-muted">
              Paste a Figma link and sync to see design tokens.
            </div>
          </div>
        </ScrollAreaViewport>
        <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
          <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
        </ScrollAreaScrollbar>
      </ScrollAreaRoot>
    </template>

    <!-- Disconnected state -->
    <div
      v-else-if="status === 'disconnected' || status === 'error'"
      class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <icon-lucide-link class="size-8 text-muted/40" />
      <div>
        <p class="text-xs text-surface">Connect to Figma</p>
        <p class="mt-1 text-[12px] text-muted">
          Import designs, sync tokens, and push changes back to Figma via MCP.
        </p>
      </div>
      <button
        class="rounded bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-500"
        @click="connect"
      >
        Connect with Figma
      </button>
    </div>

    <!-- Loading state -->
    <div
      v-else
      class="flex flex-1 items-center justify-center"
    >
      <span class="text-xs text-muted animate-pulse">Connecting to Figma...</span>
    </div>
  </div>
</template>
