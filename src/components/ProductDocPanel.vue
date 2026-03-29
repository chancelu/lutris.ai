<script setup lang="ts">
import { ref, computed } from 'vue'
import DOMPurify from 'dompurify'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { useProductDoc } from '@/composables/use-product-doc'
import { useAIChat } from '@/composables/use-chat'
import NextStepCard from './NextStepCard.vue'

const {
  currentContent,
  versions,
  isEditing,
  showMarkdown,
  isImporting,
  pendingSyncConfirm,
  hasContent,
  versionCount,
  updateContent,
  importFile,
  restoreVersion,
  requestDesignSync,
  acceptPendingSync,
  rejectPendingSync,
  getParsePrompt,
  getDocToDesignPrompt,
} = useProductDoc()

const { pendingMessage, activeTab } = useAIChat()

const { defaultSection } = defineProps<{ defaultSection?: 'summary' | 'versions' }>()

const editBuffer = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const activeSection = ref<'doc' | 'versions'>(defaultSection === 'versions' ? 'versions' : 'doc')
const isAIParsing = ref(false)
const showImportNextSteps = ref(false)

function startEditing() {
  editBuffer.value = currentContent.value
  isEditing.value = true
}

function saveEdit() {
  updateContent(editBuffer.value)
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
  editBuffer.value = ''
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await importFile(file)
  showImportNextSteps.value = true
  input.value = '' // reset
}

function handleImportNextStep(action: string) {
  if (action === 'ai-summary') {
    handleAIParse()
    return
  }
  if (action === 'to-design') {
    handleSyncToDesign()
    return
  }
  if (action === 'review-spec') {
    showImportNextSteps.value = false
  }
}

function handleSyncToDesign() {
  const content = requestDesignSync()
  if (content) {
    const prompt = getDocToDesignPrompt()
    pendingMessage.value = `${prompt}\n\n---\n\nProduct Document:\n\n${content}`
    activeTab.value = 'ai'
  }
}

async function handleAIParse() {
  if (!currentContent.value.trim()) return
  isAIParsing.value = true
  try {
    const prompt = getParsePrompt()
    pendingMessage.value = `${prompt}\n\n---\n\nRaw Document to Parse:\n\n${currentContent.value}`
    activeTab.value = 'ai'
  } finally {
    isAIParsing.value = false
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'user': return 'Manual'
    case 'design': return 'Design'
    case 'import': return 'Import'
    case 'ai': return 'AI'
    default: return source
  }
}

function sourceTone(source: string): string {
  switch (source) {
    case 'ai': return 'bg-violet-500/15 text-violet-400'
    case 'import': return 'bg-blue-500/15 text-blue-400'
    case 'design': return 'bg-emerald-500/15 text-emerald-400'
    default: return 'bg-muted/15 text-muted'
  }
}

// Simple markdown renderer (basic subset)
function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-surface mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-surface mt-4 mb-1.5">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-surface mt-4 mb-2">$1</h1>')
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-surface">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="my-2 rounded bg-inset p-2 text-[12px] text-green-300 overflow-x-auto"><code>$2</code></pre>')
    // Inline code
    .replace(/`(.+?)`/g, '<code class="rounded bg-inset px-1 py-0.5 text-[12px] text-amber-300">$1</code>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-[13px] text-muted list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-[13px] text-muted list-decimal">$1</li>')
    // Tables (basic)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(Boolean).map(c => c.trim())
      if (cells.every(c => /^[-:]+$/.test(c))) return '' // separator row
      const tds = cells.map(c => `<td class="border border-border/50 px-2 py-1 text-[12px]">${c}</td>`).join('')
      return `<tr>${tds}</tr>`
    })
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="text-[13px] text-muted/90 leading-relaxed mb-2">')
    // Line breaks
    .replace(/\n/g, '<br/>')
}

const renderedContent = computed(() => {
  if (!currentContent.value) return ''
  return DOMPurify.sanitize(renderMarkdown(currentContent.value))
})
</script>

<template>
  <div data-test-id="product-doc-panel" class="flex min-h-0 flex-1 flex-col select-text">
    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept=".md,.txt"
      class="hidden"
      @change="handleFileChange"
    />

    <!-- Sync confirmation modal -->
    <div
      v-if="pendingSyncConfirm"
      class="absolute inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div class="mx-4 max-w-sm rounded-lg border border-border bg-panel p-4">
        <p class="mb-2 text-xs font-semibold text-surface">Update from design</p>
        <p class="mb-3 text-[12px] text-muted">
          The design has changed. Accept the updated content?
        </p>
        <pre class="mb-3 max-h-32 overflow-auto rounded bg-inset p-2 text-[11px] text-muted">{{ pendingSyncConfirm.content.slice(0, 500) }}...</pre>
        <div class="flex gap-2">
          <button
            class="flex-1 rounded bg-blue-600 px-2 py-1 text-[12px] text-white hover:bg-blue-500"
            @click="acceptPendingSync"
          >
            Accept
          </button>
          <button
            class="flex-1 rounded border border-border px-2 py-1 text-[12px] text-muted hover:bg-hover"
            @click="rejectPendingSync"
          >
            Keep current
          </button>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
      <button
        class="rounded px-2 py-0.5 text-[12px]"
        :class="activeSection === 'doc' ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
        @click="activeSection = 'doc'"
      >
        <icon-lucide-file-text class="inline size-3" /> Document
      </button>
      <button
        class="rounded px-2 py-0.5 text-[12px]"
        :class="activeSection === 'versions' ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
        @click="activeSection = 'versions'"
      >
        <icon-lucide-clock class="inline size-3" /> Versions ({{ versionCount }})
      </button>
      <div class="flex-1" />
      <template v-if="hasContent && activeSection === 'doc' && !isEditing">
        <button
          class="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
          :title="showMarkdown ? 'Show source' : 'Show rendered'"
          @click="showMarkdown = !showMarkdown"
        >
          {{ showMarkdown ? 'MD' : '</>' }}
        </button>
        <button
          class="rounded px-1.5 py-0.5 text-[11px] text-blue-400 hover:bg-blue-500/10"
          @click="startEditing"
        >
          <icon-lucide-pencil class="inline size-3" /> Edit
        </button>
      </template>
    </div>

    <ScrollAreaRoot class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <!-- Document section -->
        <template v-if="activeSection === 'doc'">
          <!-- Empty state -->
          <div
            v-if="!hasContent && !isEditing"
            class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
          >
            <icon-lucide-clipboard-list class="size-6 text-muted" />
            <div>
              <p class="text-xs text-surface">Product Document</p>
              <p class="mt-1 text-[12px] text-muted">
                Import a PRD or write one from scratch.
              </p>
            </div>
            <div class="flex gap-2">
              <button
                class="rounded bg-blue-600 px-3 py-1.5 text-[12px] text-white hover:bg-blue-500"
                @click="triggerImport"
              >
                <icon-lucide-file-text class="inline size-3" /> Import file
              </button>
              <button
                class="rounded border border-border px-3 py-1.5 text-[12px] text-muted hover:bg-hover hover:text-surface"
                @click="startEditing"
              >
                <icon-lucide-pencil class="inline size-3" /> Write
              </button>
            </div>
          </div>

          <!-- Editing mode -->
          <div v-else-if="isEditing" class="flex flex-1 flex-col p-2">
            <textarea
              v-model="editBuffer"
              class="min-h-[300px] flex-1 resize-none rounded border border-border bg-transparent p-2 font-mono text-[13px] text-surface placeholder:text-muted/50 focus:border-blue-500 focus:outline-none"
              placeholder="Write your product document in Markdown..."
            />
            <div class="mt-2 flex gap-1.5">
              <button
                class="rounded bg-blue-600 px-2 py-1 text-[12px] text-white hover:bg-blue-500"
                @click="saveEdit"
              >
                Save
              </button>
              <button
                class="rounded border border-border px-2 py-1 text-[12px] text-muted hover:bg-hover"
                @click="cancelEdit"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Rendered / Source view -->
          <div v-else class="p-3">
            <div v-if="showImportNextSteps" class="mb-3">
              <NextStepCard
                title="PRD imported"
                body="Summarize, review, or turn it into a design brief."
                :actions="[
                  { label: 'Generate spec summary', value: 'ai-summary' },
                  { label: 'Review spec', value: 'review-spec' },
                  { label: 'Send to design', value: 'to-design' }
                ]"
                @action="handleImportNextStep"
              />
            </div>
            <!-- Rendered markdown (default view) -->
            <div
              v-if="showMarkdown"
              class="prose-sm doc-rendered"
              v-html="renderedContent"
            />

            <!-- Source view -->
            <pre
              v-else
              class="whitespace-pre-wrap font-mono text-[12px] text-muted leading-relaxed"
            >{{ currentContent }}</pre>

            <!-- Secondary actions (bottom) -->
            <div class="mt-4 flex items-center gap-1.5 border-t border-border/50 pt-3">
              <button
                class="rounded border border-border px-2 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
                @click="triggerImport"
              >
                <icon-lucide-file-text class="inline size-3" /> Import
              </button>
              <button
                class="rounded border border-border px-2 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
                @click="handleSyncToDesign"
              >
                <icon-lucide-palette class="inline size-3" /> To design
              </button>
              <button
                :disabled="isAIParsing"
                class="rounded border border-amber-500/50 px-2 py-0.5 text-[11px] text-amber-400 hover:bg-amber-500/10 disabled:opacity-40"
                @click="handleAIParse"
              >
                <icon-lucide-bot class="inline size-3" /> {{ isAIParsing ? 'Parsing...' : 'AI Parse' }}
              </button>
            </div>
          </div>
        </template>

        <!-- Versions section -->
        <template v-if="activeSection === 'versions'">
          <div v-if="versions.length === 0" class="px-4 py-8 text-center">
            <span class="text-[12px] text-muted">No versions yet</span>
          </div>
          <div v-else class="p-2 space-y-0.5">
            <button
              v-for="v in [...versions].reverse()"
              :key="v.id"
              class="group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-hover"
              @click="restoreVersion(v.id)"
            >
              <span class="mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium" :class="sourceTone(v.source)">
                {{ sourceLabel(v.source) }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-2">
                  <span class="truncate text-[11px] text-surface">{{ v.label || `v${v.id}` }}</span>
                  <span class="shrink-0 text-[10px] text-muted/60">{{ formatDate(v.timestamp) }}</span>
                </div>
                <div class="mt-0.5 truncate text-[10px] text-muted/50">{{ v.content.slice(0, 80) }}</div>
              </div>
              <span class="mt-0.5 shrink-0 text-[10px] text-blue-400 opacity-0 transition group-hover:opacity-100">Restore</span>
            </button>
          </div>
        </template>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <!-- Loading overlay -->
    <div
      v-if="isImporting"
      class="absolute inset-0 flex items-center justify-center bg-black/40"
    >
      <span class="text-xs text-white animate-pulse">Importing...</span>
    </div>
  </div>
</template>

<style scoped>
.doc-rendered :deep(h1),
.doc-rendered :deep(h2),
.doc-rendered :deep(h3) {
  margin-top: 0.75rem;
}
.doc-rendered :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.5rem 0;
}
.doc-rendered :deep(li) {
  margin: 0.15rem 0;
}
</style>
