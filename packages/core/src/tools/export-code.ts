import { defineTool } from './schema'
import { selectionToCode } from '../render/export-code'

import type { CodeFormat } from '../render/export-code'

// ── Code-export listener registry (Slice C) ──
// Core stays store-free: the UI layer (src/) registers listeners here and
// receives every successful export_code result. No logic changes below —
// execute() just notifies listeners in addition to returning the result.
export interface CodeExportResult {
  format: CodeFormat
  code: string
  nodeCount: number
}

export type CodeExportListener = (result: CodeExportResult) => void

const codeExportListeners = new Set<CodeExportListener>()

export function onCodeExport(cb: CodeExportListener): () => void {
  codeExportListeners.add(cb)
  return () => { codeExportListeners.delete(cb) }
}

export function clearCodeExportListeners(): void {
  codeExportListeners.clear()
}

export function notifyCodeExport(result: CodeExportResult): void {
  for (const cb of codeExportListeners) cb(result)
}

export const exportCode = defineTool({
  name: 'export_code',
  description:
    'Export selected nodes as production code. Supports Vue SFC (.vue), React component (.tsx), or standalone HTML+CSS.',
  params: {
    format: {
      type: 'string',
      description: 'Output format: "vue-sfc", "react", or "html"',
      enum: ['vue-sfc', 'react', 'html']
    },
    nodeIds: {
      type: 'string[]',
      description: 'Node IDs to export. If empty, uses current selection.'
    }
  },
  execute: (figma, args) => {
    const format = (args.format || 'html') as CodeFormat
    let ids = args.nodeIds ?? []

    if (ids.length === 0) {
      ids = figma.currentPage.selection.map((n: { id: string }) => n.id)
    }

    if (ids.length === 0) {
      return { error: 'No nodes selected. Select nodes or provide nodeIds.' }
    }

    const code = selectionToCode(ids, figma.graph, format)

    notifyCodeExport({ format, code, nodeCount: ids.length })

    return {
      format,
      code,
      nodeCount: ids.length
    }
  }
})
