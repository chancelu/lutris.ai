<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useProductDoc } from '@/composables/use-product-doc'
import { useAIChat } from '@/composables/use-chat'

const {
  currentContent,
  isEditing,
  showMarkdown,
  hasContent,
  updateContent,
  getParsePrompt,
} = useProductDoc()

const { pendingMessage, inlinePanel } = useAIChat()

const editBuffer = ref('')

function startEditing() {
  editBuffer.value = currentContent.value
  isEditing.value = true
}

function saveEdit() {
  const content = editBuffer.value
  updateContent(content)
  editBuffer.value = ''
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
  editBuffer.value = ''
}

async function handleAIParse() {
  if (!currentContent.value.trim()) return
  const prompt = getParsePrompt()
  pendingMessage.value = `${prompt}\n\n---\n\nRaw Document to Parse:\n\n${currentContent.value}`
  inlinePanel.value = null // switch back to AI Chat panel
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-surface mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-surface mt-4 mb-1.5">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-surface mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-surface">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-inset px-1 py-0.5 text-[12px] text-amber-300">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-[13px] text-muted list-disc">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-[13px] text-muted/90 leading-relaxed mb-2">')
    .replace(/\n/g, '<br/>')
}

const renderedContent = computed(() => {
  if (!currentContent.value) return ''
  return renderMarkdown(currentContent.value)
})
</script>

<template>
  <div data-test-id="product-doc-panel" class="flex min-h-0 flex-1 flex-col select-text">
    <!-- Toolbar -->
    <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
      <span class="text-[12px] font-semibold text-surface">Document</span>
      <div class="flex-1" />
      <template v-if="hasContent && !isEditing">
        <button
          class="rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
          @click="showMarkdown = !showMarkdown"
        >
          {{ showMarkdown ? 'MD' : '</>' }}
        </button>
        <button
          class="rounded px-1.5 py-0.5 text-[11px] text-blue-400 hover:bg-blue-500/10"
          @click="startEditing"
        >
          Edit
        </button>
        <button
          class="rounded px-1.5 py-0.5 text-[11px] text-amber-400 hover:bg-amber-500/10"
          @click="handleAIParse"
        >
          AI Parse
        </button>
      </template>
    </div>

    <!-- Empty state -->
    <div v-if="!hasContent && !isEditing" class="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p class="text-xs text-muted">No document yet.</p>
      <button class="rounded bg-blue-600 px-3 py-1.5 text-[12px] text-white hover:bg-blue-500" @click="startEditing">
        Write
      </button>
    </div>

    <!-- Editing mode -->
    <div v-else-if="isEditing" class="flex flex-1 flex-col p-2">
      <textarea
        v-model="editBuffer"
        class="min-h-[200px] flex-1 resize-none rounded border border-border bg-transparent p-2 font-mono text-[13px] text-surface placeholder:text-muted/50 focus:border-blue-500 focus:outline-none"
        placeholder="Write your product document in Markdown..."
      />
      <div class="mt-2 flex gap-1.5">
        <button class="rounded bg-blue-600 px-2 py-1 text-[12px] text-white hover:bg-blue-500" @click="saveEdit">Save</button>
        <button class="rounded border border-border px-2 py-1 text-[12px] text-muted hover:bg-hover" @click="cancelEdit">Cancel</button>
      </div>
    </div>

    <!-- Preview -->
    <div v-else class="flex-1 overflow-auto p-3">
      <div v-if="showMarkdown" class="prose-sm" v-html="renderedContent" />
      <pre v-else class="whitespace-pre-wrap font-mono text-[12px] text-muted leading-relaxed">{{ currentContent }}</pre>
    </div>
  </div>
</template>
