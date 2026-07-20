<script setup lang="ts">
import { ref } from 'vue'
import ProductDocPanel from './ProductDocPanel.vue'
import { useSpec } from '@/composables/use-spec'
import { createSpecPage, type SpecComponentRole } from '@/types/spec'

const { pages, hasSpec, upsertPage, removePage } = useSpec()

const expandedPageIds = ref<Set<string>>(new Set())

function togglePage(pageId: string) {
  const next = new Set(expandedPageIds.value)
  if (next.has(pageId)) next.delete(pageId)
  else next.add(pageId)
  expandedPageIds.value = next
}

function addPage() {
  const page = createSpecPage(`New page ${pages.value.length + 1}`)
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


</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-auto">
    <!-- Pages / Components (PRD §11 结构化 Spec) -->
    <div class="shrink-0 border-b border-border/30">
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
        <div v-for="page in pages" :key="page.id" class="rounded-lg border border-border/30">
          <div
            role="button"
            tabindex="0"
            class="flex w-full cursor-pointer items-center gap-1.5 px-2 py-1.5 text-left"
            @click="togglePage(page.id)"
            @keydown.enter.prevent="togglePage(page.id)"
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
              title="Delete page"
              @click.stop="deletePage(page.id)"
            >
              <icon-lucide-trash-2 class="size-3" />
            </button>
          </div>

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
