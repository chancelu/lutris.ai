<script setup lang="ts">
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-typescript'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { computed, ref, watch } from 'vue'

import { useCodeOutput, type CodeFramework } from '@/stores/code-output'

const { output, byFramework, availableFrameworks } = useCodeOutput()

const FRAMEWORK_ORDER: CodeFramework[] = ['Vue', 'React', 'HTML']
const frameworks = computed(() =>
  FRAMEWORK_ORDER.filter((f) => availableFrameworks.value.includes(f))
)

const activeFramework = ref<CodeFramework | null>(null)
watch(output, (next) => {
  if (next) activeFramework.value = next.framework
})

const payload = computed(() => {
  const selected = activeFramework.value
    ? byFramework.value[activeFramework.value]
    : undefined
  return selected ?? output.value
})

const activeFileIndex = ref(0)
watch(payload, () => {
  activeFileIndex.value = 0
})

const activeFile = computed(() => payload.value?.files[activeFileIndex.value] ?? null)

const LANGUAGE: Record<CodeFramework, { grammar: string; name: string }> = {
  Vue: { grammar: 'markup', name: 'markup' },
  HTML: { grammar: 'markup', name: 'markup' },
  React: { grammar: 'typescript', name: 'tsx' },
}

const highlightedLines = computed(() => {
  const file = activeFile.value
  if (!file) return []
  const lang = LANGUAGE[payload.value?.framework ?? 'HTML']
  const grammar = Prism.languages[lang.grammar] ?? Prism.languages.plain
  return file.code.split('\n').map((line) => Prism.highlight(line, grammar, lang.name))
})

const copied = ref(false)
let copyTimeout: number | undefined

function copyCode() {
  const file = activeFile.value
  if (!file) return
  navigator.clipboard.writeText(file.code)
  copied.value = true
  clearTimeout(copyTimeout)
  copyTimeout = setTimeout(() => (copied.value = false), 2000)
}

function downloadCode() {
  const file = activeFile.value
  if (!file) return
  const blob = new Blob([file.code], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.path
  a.click()
  URL.revokeObjectURL(url)
}

watch(activeFile, () => {
  copied.value = false
})
</script>

<template>
  <!-- Empty state -->
  <div
    v-if="!payload"
    data-test-id="code-panel-empty"
    class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
  >
    <img src="/lutris-otter.png" class="h-16 w-auto object-contain opacity-80" alt="" />
    <p class="text-[12px] text-muted">Ask the AI to export your code.</p>
  </div>

  <div v-else data-test-id="code-panel" class="flex min-h-0 flex-1 flex-col">
    <!-- Header: framework tabs + actions -->
    <div
      data-test-id="code-panel-header"
      class="flex shrink-0 items-center justify-between gap-2 border-b border-border/30 px-3 py-1.5"
    >
      <div class="flex items-center gap-0.5">
        <button
          v-for="f in frameworks"
          :key="f"
          :data-test-id="`code-panel-framework-${f.toLowerCase()}`"
          class="rounded-full px-2 py-0.5 text-[11px] font-medium transition"
          :class="f === payload.framework ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
          @click="activeFramework = f"
        >
          {{ f }}
        </button>
      </div>
      <div class="flex items-center gap-0.5">
        <button
          data-test-id="code-panel-copy"
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted transition hover:bg-hover hover:text-surface"
          @click="copyCode"
        >
          <icon-lucide-check v-if="copied" class="size-3 text-green-400" />
          <icon-lucide-copy v-else class="size-3" />
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
        <button
          data-test-id="code-panel-download"
          class="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted transition hover:bg-hover hover:text-surface"
          @click="downloadCode"
        >
          <icon-lucide-download class="size-3" />
          Download
        </button>
      </div>
    </div>

    <!-- File list (only when more than one file) -->
    <div
      v-if="payload.files.length > 1"
      data-test-id="code-panel-files"
      class="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border/30 px-3 py-1"
    >
      <button
        v-for="(file, i) in payload.files"
        :key="file.path"
        class="rounded px-1.5 py-0.5 font-mono text-[10px] transition"
        :class="i === activeFileIndex ? 'bg-hover text-surface' : 'text-muted hover:text-surface'"
        @click="activeFileIndex = i"
      >
        {{ file.path }}
      </button>
    </div>

    <!-- Current file name -->
    <div class="shrink-0 border-b border-border/30 px-3 py-1 font-mono text-[10px] text-muted">
      {{ activeFile?.path }}
    </div>

    <ScrollAreaRoot class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="p-3">
          <div v-for="(html, i) in highlightedLines" :key="i" class="flex text-xs leading-5">
            <span
              class="mr-3 shrink-0 text-right text-muted/40 select-none"
              style="min-width: 1.5em"
            >{{ i + 1 }}</span>
            <pre
              class="m-0 min-w-0 flex-1 break-words whitespace-pre-wrap"
            ><code v-html="html" /></pre>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>
  </div>
</template>

<style>
.token.tag { color: #7dd3fc; }
.token.attr-name, .token.attr-value .token.punctuation { color: #c4b5fd; }
.token.attr-value, .token.string { color: #86efac; }
.token.number { color: #fca5a5; }
.token.punctuation { color: #888; }
.token.boolean, .token.constant { color: #fca5a5; }
.token.keyword { color: #c4b5fd; }
.token.function { color: #7dd3fc; }
.token.comment { color: #6b7280; }
</style>
