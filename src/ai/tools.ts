import { valibotSchema } from '@ai-sdk/valibot'
import { tool } from 'ai'
import * as v from 'valibot'

import { makeFigmaFromStore } from '@/automation/figma-factory'
import { ALL_TOOLS, computeAllLayouts, toolsToAI } from '@open-pencil/core'
import { useImageGen } from '@/composables/use-image-gen'
import { useProductDoc } from '@/composables/use-product-doc'
import { toast } from '@/composables/use-toast'

import type { EditorStore } from '@/stores/editor'
import type { SceneNode } from '@open-pencil/core'

export function createAITools(store: EditorStore) {
  // Batch undo: capture one before-snapshot for the entire AI turn
  let batchBeforeSnapshot: Map<string, SceneNode> | null = null
  let batchActive = false

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
      onAfterExecute: (def) => {
        computeAllLayouts(store.graph, store.state.currentPageId)
        store.requestRender()
        // No per-tool undo push — commitAIBatch() handles it
        if (def.mutates) {
          const { hasContent, updateFromDesign } = useProductDoc()
          if (hasContent.value) {
            const timestamp = new Date().toLocaleTimeString()
            updateFromDesign(
              `[AI modification at ${timestamp}] Tool: ${def.name}. Design canvas was updated. Please review and sync your product document if needed.`
            )
          }
          toast.show('Design updated by AI. PRD sync pending — check Product Doc tab.')
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
    batchBeforeSnapshot = null
    batchActive = false
  }

  const tools = { ...coreTools, generate_image: generateImage }
  return { tools, commitAIBatch }
}

export type AITools = ReturnType<typeof createAITools>
