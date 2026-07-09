<script setup lang="ts">
import { computed, ref } from 'vue'
import ProductDocPanel from './ProductDocPanel.vue'
import { useSpec } from '@/composables/use-spec'
import { useAIChat } from '@/composables/use-chat'
import { useEditorStore } from '@/stores/editor'
import { createSpecPage, type SpecComponentRole } from '@/types/spec'

const { pages, summary, summaryFromPages, hasSpec, upsertPage, removePage } = useSpec()
const { pendingMessage, pendingSystemPrefix, inlinePanel } = useAIChat()
const store = useEditorStore()

const hasCanvasContent = computed(() => {
  const page = store.graph.nodes.get(store.state.currentPageId)
  return (page?.childIds?.length ?? 0) > 0
})

const expandedPageIds = ref<Set<string>>(new Set())

function togglePage(pageId: string) {
  const next = new Set(expandedPageIds.value)
  if (next.has(pageId)) next.delete(pageId)
  else next.add(pageId)
  expandedPageIds.value = next
}

function addPage() {
  const page = createSpecPage(`新页面 ${pages.value.length + 1}`)
  upsertPage(page, 'user', 'Added page')
  expandedPageIds.value = new Set([...expandedPageIds.value, page.id])
}

function deletePage(pageId: string) {
  removePage(pageId, 'user', 'Removed page')
}

function countComponents(role?: SpecComponentRole): number {
  let total = 0
  for (const page of pages.value) total += countInList(page.components, role)
  return total
}

function countInList(list: readonly { role: SpecComponentRole; children?: readonly unknown[] }[], role?: SpecComponentRole): number {
  let total = 0
  for (const c of list) {
    if (!role || c.role === role) total += 1
    if (c.children) total += countInList(c.children as { role: SpecComponentRole; children?: readonly unknown[] }[], role)
  }
  return total
}

function generateDesignFromSpec() {
  if (!hasSpec.value) return
  pendingSystemPrefix.value = 'CRITICAL INSTRUCTION: You MUST call the render() tool IMMEDIATELY as your FIRST and ONLY action. Do NOT write ANY text, explanation, or planning. Just call render() with complete JSX code. ANY text response without a render() call is a FAILURE.\n\nImplement this spec on canvas NOW:\n\n'
  pendingMessage.value = 'Generate design from this spec:\n\n' + (summaryFromPages.value || summary.value)
  inlinePanel.value = null // switch back to AI Chat
}

function updateSpecFromDesign() {
  pendingSystemPrefix.value = 'CRITICAL INSTRUCTION: Call design_overview, then describe each screen, then update the existing spec to reflect the current design state. Focus on what changed.\n\n'
  pendingMessage.value = 'Update the spec based on the current design on canvas.'
  inlinePanel.value = null
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-auto">
    <!-- Generate Design CTA -->
    <div v-if="hasSpec || hasCanvasContent" class="shrink-0 border-b border-border px-3 py-2.5 space-y-2">
      <button
        v-if="hasSpec"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-accent/85"
        @click="generateDesignFromSpec"
      >
        <icon-lucide-wand-2 class="size-3.5" />
        Generate Design from Spec
      </button>
      <button
        v-if="hasCanvasContent"
        class="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 text-[12px] font-medium text-accent transition hover:bg-accent/10"
        @click="updateSpecFromDesign"
      >
        <icon-lucide-scan-search class="size-3.5" />
        Update Spec from Design
      </button>
      <p v-if="hasSpec" class="text-center text-[10px] text-muted">AI will create UI screens based on your spec</p>
    </div>

    <!-- Pages / Components (PRD §11 结构化 Spec) -->
    <div class="shrink-0 border-b border-border">
      <div class="flex items-center gap-1 px-3 py-2">
        <span class="text-[12px] font-semibold text-surface">Pages</span>
        <span class="text-[10px] text-muted">({{ pages.length }} pages · {{ countComponents() }} components)</span>
        <div class="flex-1" />
        <button
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-blue-400 hover:bg-blue-500/10"
          @click="addPage"
        >
          <icon-lucide-plus class="size-3" />
          Add Page
        </button>
      </div>

      <div v-if="pages.length === 0" class="px-3 pb-3 text-[11px] text-muted">
        No pages yet. Add one manually, or let AI create them from a conversation.
      </div>

      <div v-else class="max-h-64 overflow-auto px-2 pb-2 space-y-1">
        <div v-for="page in pages" :key="page.id" class="rounded-lg border border-border/60">
          <button
            class="flex w-full items-center gap-1.5 px-2 py-1.5 text-left"
            @click="togglePage(page.id)"
          >
            <icon-lucide-chevron-right
              class="size-3 shrink-0 text-muted transition-transform"
              :class="{ 'rotate-90': expandedPageIds.has(page.id) }"
            />
            <span class="truncate text-[12px] font-medium text-surface">{{ page.name }}</span>
            <span class="truncate text-[10px] text-muted">{{ page.route }}</span>
            <div class="flex-1" />
            <span class="text-[10px] text-muted">{{ page.components.length }}</span>
            <button
              class="rounded p-0.5 text-muted hover:bg-red-500/10 hover:text-red-400"
              @click.stop="deletePage(page.id)"
            >
              <icon-lucide-trash-2 class="size-3" />
            </button>
          </button>

          <div v-if="expandedPageIds.has(page.id)" class="space-y-1.5 px-2 pb-2 pl-6">
            <p v-if="page.purpose" class="text-[11px] text-muted">{{ page.purpose }}</p>
            <p v-if="page.userStory" class="text-[11px] italic text-muted/80">{{ page.userStory }}</p>
            <div v-if="page.components.length > 0" class="space-y-0.5">
              <div v-for="c in page.components" :key="c.id" class="flex items-center gap-1.5 text-[11px] text-muted">
                <span class="rounded bg-inset px-1 py-0.5 text-[10px] text-amber-300">{{ c.role }}</span>
                <span class="text-surface/90">{{ c.name }}</span>
                <span v-if="c.repeatable" class="text-[9px] text-muted/70">(repeatable)</span>
              </div>
            </div>
            <p v-else class="text-[11px] text-muted/60">No components yet.</p>
            <div v-if="page.interactionRules.length > 0" class="space-y-0.5 pt-1">
              <div v-for="r in page.interactionRules" :key="r.id" class="text-[11px] text-muted">
                {{ r.trigger }} → {{ r.action }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Freeform notes (兜底自由文本，AI对话产出未拆解成 Page 时落在这里) -->
    <div class="min-h-0 flex-1 overflow-auto">
      <ProductDocPanel default-section="summary" class="min-h-0 flex-1" />
    </div>
  </div>
</template>
