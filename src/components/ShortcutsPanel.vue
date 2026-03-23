<script setup lang="ts">
import { ref, computed } from 'vue'

const show = ref(false)
const search = ref('')

function toggle() { show.value = !show.value; search.value = '' }

defineExpose({ toggle })

const isMac = navigator.platform.includes('Mac')
const mod = isMac ? 'Cmd' : 'Ctrl'

const sections = [
  {
    title: 'Tools',
    shortcuts: [
      { keys: 'V', desc: 'Move' },
      { keys: 'F', desc: 'Frame' },
      { keys: 'R', desc: 'Rectangle' },
      { keys: 'O', desc: 'Ellipse' },
      { keys: 'P', desc: 'Pen' },
      { keys: 'T', desc: 'Text' },
      { keys: 'H', desc: 'Hand' },
    ],
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: `${mod}+Z`, desc: 'Undo' },
      { keys: `${mod}+Shift+Z`, desc: 'Redo' },
      { keys: `${mod}+C`, desc: 'Copy' },
      { keys: `${mod}+V`, desc: 'Paste' },
      { keys: `${mod}+D`, desc: 'Duplicate' },
      { keys: 'Del', desc: 'Delete' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { keys: `${mod}+0`, desc: 'Zoom to 100%' },
      { keys: `${mod}+1`, desc: 'Zoom to fit' },
      { keys: `${mod}++`, desc: 'Zoom in' },
      { keys: `${mod}+-`, desc: 'Zoom out' },
    ],
  },
  {
    title: 'Panels',
    shortcuts: [
      { keys: `${mod}+E`, desc: 'Export' },
      { keys: `${mod}+/`, desc: 'Comments' },
      { keys: `${mod}+B`, desc: 'Brand' },
      { keys: `${mod}+Shift+F`, desc: 'Figma' },
      { keys: `${mod}+Shift+D`, desc: 'Product Doc' },
      { keys: `${mod}+?`, desc: 'This panel' },
    ],
  },
]

const filteredSections = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return sections
  return sections
    .map(s => ({
      ...s,
      shortcuts: s.shortcuts.filter(
        sc => sc.desc.toLowerCase().includes(q) || sc.keys.toLowerCase().includes(q)
      ),
    }))
    .filter(s => s.shortcuts.length > 0)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="show = false"
      >
        <div class="w-[420px] max-h-[70vh] overflow-auto rounded-xl border border-border bg-panel p-5 shadow-2xl">
          <div class="mb-4 flex items-center justify-between">
            <span class="text-sm font-semibold text-surface">Keyboard Shortcuts</span>
            <button
              class="rounded p-1 text-muted hover:bg-hover hover:text-surface"
              @click="show = false"
            >
              <icon-lucide-x class="size-4" />
            </button>
          </div>
          <input
            v-model="search"
            type="text"
            placeholder="Search shortcuts..."
            class="mb-3 w-full rounded border border-border bg-transparent px-2.5 py-1.5 text-[13px] text-surface placeholder:text-muted/50 focus:border-accent focus:outline-none"
          />
          <div v-if="filteredSections.length === 0" class="py-4 text-center text-[12px] text-muted">
            No shortcuts match "{{ search }}"
          </div>
          <div v-for="section in filteredSections" :key="section.title" class="mb-4 last:mb-0">
            <div class="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted">
              {{ section.title }}
            </div>
            <div
              v-for="s in section.shortcuts"
              :key="s.keys"
              class="flex items-center justify-between py-1"
            >
              <span class="text-[13px] text-surface">{{ s.desc }}</span>
              <div class="flex gap-0.5">
                <kbd
                  v-for="key in s.keys.split('+')"
                  :key="key"
                  class="rounded border border-border bg-inset px-1.5 py-0.5 text-[11px] font-mono text-muted"
                >
                  {{ key }}
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
