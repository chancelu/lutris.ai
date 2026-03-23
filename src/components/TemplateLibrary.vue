<script setup lang="ts">
import { computed } from 'vue'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { useTemplates } from '@/composables/use-templates'
import { useAIChat } from '@/composables/use-chat'

const { categories, selectedCategory, searchQuery, getFilteredTemplates } = useTemplates()
const { pendingMessage, activeTab } = useAIChat()

const filtered = computed(() => getFilteredTemplates())

function applyTemplate(prompt: string) {
  pendingMessage.value = prompt
  activeTab.value = 'ai'
}

function clearFilter() {
  selectedCategory.value = null
  searchQuery.value = ''
}
</script>

<template>
  <div data-test-id="template-library" class="flex min-h-0 flex-1 flex-col">
    <!-- Header -->
    <div class="shrink-0 border-b border-border px-3 py-2">
      <span class="text-xs font-semibold text-surface">Template Library</span>
    </div>

    <!-- Search -->
    <div class="shrink-0 border-b border-border px-3 py-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search templates..."
        class="w-full rounded border border-border bg-transparent px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:border-blue-500 focus:outline-none"
      />
    </div>

    <!-- Category filter -->
    <div class="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
      <button
        class="rounded px-2 py-0.5 text-[12px]"
        :class="!selectedCategory ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
        @click="selectedCategory = null"
      >
        All
      </button>
      <button
        v-for="cat in categories"
        :key="cat"
        class="rounded px-2 py-0.5 text-[12px]"
        :class="selectedCategory === cat ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
        @click="selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <ScrollAreaRoot class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="grid grid-cols-2 gap-2 p-2">
          <div
            v-for="t in filtered"
            :key="t.id"
            class="group cursor-pointer rounded-lg border border-border/50 p-2.5 transition-all hover:border-accent/50 hover:bg-accent/5 hover:shadow-md hover:shadow-accent/5 hover:-translate-y-0.5"
            @click="applyTemplate(t.prompt)"
          >
            <!-- Thumbnail SVG wireframe -->
            <div class="mb-1.5 flex h-16 items-center justify-center rounded bg-inset">
              <!-- Landing -->
              <svg v-if="t.category === 'Landing'" viewBox="0 0 80 48" class="h-10 w-16 text-muted/40">
                <rect x="2" y="2" width="76" height="10" rx="1" fill="currentColor" opacity="0.3" />
                <rect x="16" y="16" width="48" height="4" rx="1" fill="currentColor" opacity="0.6" />
                <rect x="24" y="23" width="32" height="3" rx="1" fill="currentColor" opacity="0.3" />
                <rect x="28" y="30" width="24" height="6" rx="2" fill="currentColor" opacity="0.5" />
                <rect x="2" y="40" width="24" height="6" rx="1" fill="currentColor" opacity="0.2" />
                <rect x="28" y="40" width="24" height="6" rx="1" fill="currentColor" opacity="0.2" />
                <rect x="54" y="40" width="24" height="6" rx="1" fill="currentColor" opacity="0.2" />
              </svg>
              <!-- Dashboard -->
              <svg v-else-if="t.category === 'Dashboard'" viewBox="0 0 80 48" class="h-10 w-16 text-muted/40">
                <rect x="2" y="2" width="16" height="44" rx="1" fill="currentColor" opacity="0.2" />
                <rect x="20" y="2" width="14" height="10" rx="1" fill="currentColor" opacity="0.3" />
                <rect x="36" y="2" width="14" height="10" rx="1" fill="currentColor" opacity="0.3" />
                <rect x="52" y="2" width="14" height="10" rx="1" fill="currentColor" opacity="0.3" />
                <rect x="68" y="2" width="10" height="10" rx="1" fill="currentColor" opacity="0.3" />
                <rect x="20" y="14" width="58" height="32" rx="1" fill="currentColor" opacity="0.15" />
                <polyline points="24,40 34,28 44,34 54,22 64,30 74,24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4" />
              </svg>
              <!-- Auth -->
              <svg v-else-if="t.category === 'Auth'" viewBox="0 0 80 48" class="h-10 w-16 text-muted/40">
                <rect x="20" y="2" width="40" height="44" rx="2" fill="currentColor" opacity="0.1" />
                <circle cx="40" cy="12" r="4" fill="currentColor" opacity="0.3" />
                <rect x="26" y="19" width="28" height="4" rx="1" fill="currentColor" opacity="0.2" />
                <rect x="26" y="25" width="28" height="4" rx="1" fill="currentColor" opacity="0.2" />
                <rect x="30" y="33" width="20" height="5" rx="2" fill="currentColor" opacity="0.4" />
              </svg>
              <!-- Profile -->
              <svg v-else-if="t.category === 'Profile'" viewBox="0 0 80 48" class="h-10 w-16 text-muted/40">
                <rect x="2" y="2" width="18" height="44" rx="1" fill="currentColor" opacity="0.15" />
                <circle cx="40" cy="14" r="6" fill="currentColor" opacity="0.3" />
                <rect x="26" y="24" width="28" height="3" rx="1" fill="currentColor" opacity="0.2" />
                <rect x="26" y="30" width="28" height="3" rx="1" fill="currentColor" opacity="0.2" />
                <rect x="26" y="36" width="28" height="3" rx="1" fill="currentColor" opacity="0.2" />
              </svg>
              <!-- E-commerce -->
              <svg v-else viewBox="0 0 80 48" class="h-10 w-16 text-muted/40">
                <rect x="2" y="2" width="18" height="22" rx="1" fill="currentColor" opacity="0.2" />
                <rect x="22" y="2" width="18" height="22" rx="1" fill="currentColor" opacity="0.2" />
                <rect x="42" y="2" width="18" height="22" rx="1" fill="currentColor" opacity="0.2" />
                <rect x="62" y="2" width="16" height="22" rx="1" fill="currentColor" opacity="0.2" />
                <rect x="4" y="26" width="14" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
                <rect x="24" y="26" width="14" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
                <rect x="44" y="26" width="14" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
                <rect x="64" y="26" width="12" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
              </svg>
            </div>
            <!-- Info -->
            <div class="text-[12px] font-semibold text-surface">{{ t.name }}</div>
            <div class="mt-0.5 text-[11px] text-muted line-clamp-2">{{ t.description }}</div>
            <!-- Apply button (visible on hover) -->
            <button
              class="mt-1.5 w-full rounded bg-blue-600 py-0.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100"
              @click.stop="applyTemplate(t.prompt)"
            >
              Use Template
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="filtered.length === 0" class="px-4 py-8 text-center">
          <span class="text-[12px] text-muted">No templates match your search.</span>
          <button class="mt-2 block w-full text-[12px] text-blue-400 hover:text-blue-300" @click="clearFilter">
            Clear filters
          </button>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>
  </div>
</template>
