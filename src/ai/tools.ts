import { valibotSchema } from '@ai-sdk/valibot'
import { tool } from 'ai'
import * as v from 'valibot'

import { makeFigmaFromStore } from '@/automation/figma-factory'
import { ALL_TOOLS, computeAllLayouts, computeLayout, extractNodeIds, toolsToAI } from '@llc3233149/core'
import { useImageGen } from '@/composables/use-image-gen'
import { useProductDoc } from '@/composables/use-product-doc'
import { toast } from '@/composables/use-toast'

import type { EditorStore } from '@/stores/editor'
import type { SceneNode } from '@llc3233149/core'

/** Walk up the tree to find the nearest auto-layout ancestor frame */
function findAutoLayoutAncestor(store: EditorStore, nodeId: string): string | null {
  let current = store.graph.getNode(nodeId)
  while (current) {
    if (current.layoutMode !== 'NONE') return current.id
    const parent = current.parentId ? store.graph.getNode(current.parentId) : null
    if (!parent || parent.type === 'CANVAS') break
    current = parent
  }
  return null
}

/** Collect all node IDs mentioned in tool args and result */
function collectAffectedIds(args: Record<string, unknown>, result: unknown): string[] {
  const ids = new Set<string>()
  // From args: id, ids, parentId, parent_id, target_id, node_id
  for (const key of ['id', 'parentId', 'parent_id', 'target_id', 'node_id']) {
    const v = args[key]
    if (typeof v === 'string' && v) ids.add(v)
  }
  if (Array.isArray(args.ids)) {
    for (const v of args.ids) { if (typeof v === 'string') ids.add(v) }
  }
  // From result
  for (const id of extractNodeIds(result)) ids.add(id)
  return [...ids]
}

export function createAITools(store: EditorStore) {
  // Batch undo: capture one before-snapshot for the entire AI turn
  let batchBeforeSnapshot: Map<string, SceneNode> | null = null
  let batchActive = false
  let batchHasMutations = false

  // Filter out dangerous tools in production (evalCode allows arbitrary code execution)
  const safeTools = import.meta.env.DEV
    ? ALL_TOOLS
    : ALL_TOOLS.filter((t) => t.name !== 'eval')

  const coreTools = toolsToAI(
    safeTools,
    {
      getFigma: () => makeFigmaFromStore(store),
      onBeforeExecute: (def) => {
        if (def.mutates && !batchActive) {
          batchBeforeSnapshot = store.snapshotPage()
          batchActive = true
        }
      },
      onAfterExecute: (def, result, args) => {
        // Only recompute layout for the auto-layout ancestors of affected nodes,
        // not the entire page — avoids disrupting other frames' layouts
        const affectedIds = collectAffectedIds(args, result)
        const recomputed = new Set<string>()
        for (const id of affectedIds) {
          // Also check the node itself (it might be an auto-layout frame)
          const node = store.graph.getNode(id)
          if (node && node.layoutMode !== 'NONE' && !recomputed.has(id)) {
            recomputed.add(id)
            computeLayout(store.graph, id)
          }
          const ancestor = findAutoLayoutAncestor(store, id)
          if (ancestor && !recomputed.has(ancestor)) {
            recomputed.add(ancestor)
            computeLayout(store.graph, ancestor)
          }
        }
        // If no specific frames were recomputed but the tool mutates,
        // only recompute layout for newly created top-level frames
        // (don't touch existing frames that weren't modified)
        if (recomputed.size === 0 && def.mutates) {
          const resultIds = extractNodeIds(result)
          for (const id of resultIds) {
            const n = store.graph.getNode(id)
            if (n && n.layoutMode !== 'NONE') {
              computeLayout(store.graph, id)
            }
          }
        }
        store.requestRender()
        // No per-tool undo push — commitAIBatch() handles it
        // Track that mutations happened; toast + PRD sync deferred to commitAIBatch()
        if (def.mutates) {
          batchHasMutations = true
        }
      },
      onFlashNodes: (nodeIds) => {
        store.flashNodes(nodeIds)
      }
    },
    { v, valibotSchema, tool }
  )

  const generateImage = tool({
    description: 'Generate an image using AI (Gemini) and insert it into the canvas as an image node. Use when the user asks for illustrations, icons, backgrounds, photos, or any visual asset.',
    parameters: valibotSchema(
      v.object({
        prompt: v.pipe(v.string(), v.description('Description of the image to generate')),
        width: v.optional(v.pipe(v.number(), v.description('Desired width in pixels')), 512),
        height: v.optional(v.pipe(v.number(), v.description('Desired height in pixels')), 512),
        x: v.optional(v.pipe(v.number(), v.description('X position on canvas')), 100),
        y: v.optional(v.pipe(v.number(), v.description('Y position on canvas')), 100),
      })
    ),
    // @ts-expect-error -- valibotSchema doesn't properly infer execute param types for tool()
    // eslint-disable-next-line typescript/no-explicit-any -- valibotSchema doesn't infer execute params
    execute: async ({ prompt, width, height, x, y }: any) => {
      // Start batch if not already active
      if (!batchActive) {
        batchBeforeSnapshot = store.snapshotPage()
        batchActive = true
      }

      const { generateImage: gen, base64ToBlobUrl } = useImageGen()

      const pageId = store.state.currentPageId
      const placeholder = store.graph.createNode('RECTANGLE', pageId, {
        name: `⏳ Generating: ${prompt.slice(0, 30)}...`,
        x: x ?? 100,
        y: y ?? 100,
        width: width ?? 512,
        height: height ?? 512,
        fills: [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.2, a: 1 }, visible: true, opacity: 0.5 }],
        cornerRadius: 8,
      })
      computeAllLayouts(store.graph, pageId)
      store.requestRender()
      store.flashNodes([placeholder.id])

      let pulseFrame = 0
      const pulseInterval = setInterval(() => {
        pulseFrame++
        const opacity = 0.3 + 0.2 * Math.sin(pulseFrame * 0.15)
        store.graph.updateNode(placeholder.id, {
          fills: [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.2, a: 1 }, visible: true, opacity }],
        })
        store.requestRender()
      }, 60)

      toast.show(`🎨 Generating image: "${prompt.slice(0, 40)}"...`)

      let result: Awaited<ReturnType<typeof gen>>
      try {
        result = await gen(prompt)
      } finally {
        clearInterval(pulseInterval)
      }

      if (!result) {
        store.graph.updateNode(placeholder.id, { visible: false })
        store.requestRender()
        toast.show('Image generation failed. Check Gemini API key in Brand Settings.', 'error')
        return { success: false, error: 'Image generation failed. Check Gemini API key in Brand Settings.' }
      }

      const blobUrl = base64ToBlobUrl(result.base64, result.mimeType)

      store.graph.updateNode(placeholder.id, {
        name: `AI Image: ${prompt.slice(0, 30)}`,
        fills: [{
          type: 'IMAGE',
          imageRef: blobUrl,
          scaleMode: 'FILL',
          visible: true,
          opacity: 1,
        } as never]
      })
      computeAllLayouts(store.graph, pageId)
      store.requestRender()
      store.select([placeholder.id])
      store.flashNodes([placeholder.id])

      toast.show(`✅ Image generated: "${prompt.slice(0, 40)}"`)

      return {
        success: true,
        nodeId: placeholder.id,
        message: `Generated image "${prompt.slice(0, 50)}" and placed at (${x ?? 100}, ${y ?? 100})`,
        aiDescription: result.text,
      }
    },
  })

  function commitAIBatch() {
    if (batchActive && batchBeforeSnapshot) {
      const before = batchBeforeSnapshot
      const after = store.snapshotPage()
      store.pushUndoEntry({
        label: 'AI: design generation',
        forward: () => store.restorePageFromSnapshot(after),
        inverse: () => store.restorePageFromSnapshot(before),
      })
    }
    // Show toast + PRD sync once per batch, not per tool call
    if (batchHasMutations) {
      const { hasContent, updateFromDesign } = useProductDoc()
      if (hasContent.value) {
        const timestamp = new Date().toLocaleTimeString()
        updateFromDesign(
          `[AI modification at ${timestamp}] Design canvas was updated. Please review and sync your product document if needed.`
        )
        toast.show('Design updated by AI. PRD sync pending — check Product Doc tab.')
      }
    }
    batchBeforeSnapshot = null
    batchActive = false
    batchHasMutations = false
  }

  const tools = {
    ...coreTools,
    generate_image: generateImage,
  }
  return { tools, commitAIBatch }
}

export type AITools = ReturnType<typeof createAITools>
