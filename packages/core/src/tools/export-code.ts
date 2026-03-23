import { defineTool } from './schema'
import { selectionToCode } from '../render/export-code'

import type { CodeFormat } from '../render/export-code'

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
    let ids = (args.nodeIds ?? []) as string[]

    if (ids.length === 0) {
      ids = figma.currentPage.selection.map((n: { id: string }) => n.id)
    }

    if (ids.length === 0) {
      return { error: 'No nodes selected. Select nodes or provide nodeIds.' }
    }

    const code = selectionToCode(ids, figma.graph, format)

    return {
      format,
      code,
      nodeCount: ids.length
    }
  }
})
