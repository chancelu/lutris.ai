import { computed, readonly, ref } from 'vue'

// Deep relative import on purpose: the package exports map only exposes the
// index entry, and Slice C may not touch the core index files. Vite resolves
// this to the same real file the tool registry uses, so the listener
// registered here fires when export_code executes.
import { onCodeExport } from '../../packages/core/src/tools/export-code'

import type { CodeFormat } from '../../packages/core/src/render/export-code'

export type CodeFramework = 'Vue' | 'React' | 'HTML'

export interface CodeOutputFile {
  path: string
  code: string
}

export interface CodeOutput {
  framework: CodeFramework
  files: CodeOutputFile[]
  exportedAt: number
}

const FRAMEWORK_LABEL: Record<CodeFormat, CodeFramework> = {
  'vue-sfc': 'Vue',
  react: 'React',
  html: 'HTML',
}

const FILE_NAME: Record<CodeFormat, string> = {
  'vue-sfc': 'Component.vue',
  react: 'Component.tsx',
  html: 'index.html',
}

/** Latest export_code payload — contract shape: { framework, files, exportedAt } | null */
const output = ref<CodeOutput | null>(null)

/** Last payload per framework, so the Code view can offer framework tabs. */
const byFramework = ref<Partial<Record<CodeFramework, CodeOutput>>>({})

onCodeExport((result) => {
  const framework = FRAMEWORK_LABEL[result.format] ?? 'HTML'
  const payload: CodeOutput = {
    framework,
    files: [{ path: FILE_NAME[result.format] ?? 'index.html', code: result.code }],
    exportedAt: Date.now(),
  }
  output.value = payload
  byFramework.value = { ...byFramework.value, [framework]: payload }
})

export function useCodeOutput() {
  const hasCode = computed(() => output.value !== null)
  const availableFrameworks = computed(
    () => Object.keys(byFramework.value) as CodeFramework[]
  )
  return {
    output: readonly(output),
    byFramework: readonly(byFramework),
    hasCode,
    availableFrameworks,
  }
}
