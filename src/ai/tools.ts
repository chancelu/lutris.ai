import { valibotSchema } from '@ai-sdk/valibot'
import { tool } from 'ai'
import * as v from 'valibot'

import { makeFigmaFromStore } from '@/automation/figma-factory'
import { ALL_TOOLS, computeAllLayouts, computeLayout, extractNodeIds, toolsToAI } from '@open-pencil/core'
import { useImageGen } from '@/composables/use-image-gen'
import { useProductDoc } from '@/composables/use-product-doc'
import { toast } from '@/composables/use-toast'
import * as stitchClient from '@/lib/stitch-client'
import { importStitchHtml } from '@/lib/stitch-html-import'

import type { EditorStore } from '@/stores/editor'
import type { SceneNode } from '@open-pencil/core'

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

  const stitchGenerate = tool({
    description: 'Generate a UI screen from a text description using Google Stitch. Returns HTML that is automatically imported as design nodes on the canvas. Use when the user asks to create screens, pages, or UI from a description using Stitch.',
    parameters: valibotSchema(
      v.object({
        prompt: v.pipe(v.string(), v.description('Description of the UI screen to generate')),
        projectId: v.optional(v.pipe(v.string(), v.description('Optional Stitch project ID to associate with'))),
      })
    ),
    // @ts-expect-error -- valibotSchema doesn't properly infer execute param types for tool()
    // eslint-disable-next-line typescript/no-explicit-any -- valibotSchema doesn't infer execute params
    execute: async (args: any) => {
      const prompt: string | undefined = args?.prompt
      const projectId: string | undefined = args?.projectId
      if (!prompt || typeof prompt !== 'string') {
        return { success: false, error: 'Missing required parameter: prompt' }
      }

      if (!batchActive) {
        batchBeforeSnapshot = store.snapshotPage()
        batchActive = true
      }

      const pageId = store.state.currentPageId
      const placeholder = store.graph.createNode('FRAME', pageId, {
        name: `⏳ Stitch: ${prompt.slice(0, 30)}...`,
        x: 100, y: 100, width: 375, height: 200,
        layoutMode: 'VERTICAL',
        fills: [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.18, a: 1 }, visible: true, opacity: 0.4 }],
        cornerRadius: 12,
      })
      computeAllLayouts(store.graph, pageId)
      store.requestRender()
      store.flashNodes([placeholder.id])

      let pulseFrame = 0
      const pulseInterval = setInterval(() => {
        pulseFrame++
        const opacity = 0.25 + 0.15 * Math.sin(pulseFrame * 0.12)
        store.graph.updateNode(placeholder.id, {
          fills: [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.18, a: 1 }, visible: true, opacity }],
        })
        store.requestRender()
      }, 60)

      toast.show(`🎨 Generating UI with Stitch: "${prompt.slice(0, 40)}"...`)

      try {
        const result = await stitchClient.generateScreen(prompt, { projectId })

        clearInterval(pulseInterval)
        // Remove placeholder
        store.graph.deleteNode(placeholder.id)

        if (!result.html) {
          store.requestRender()
          return { success: false, error: 'Stitch returned no HTML' }
        }

        const { rootId, nodeCount } = importStitchHtml(result.html, pageId, store.graph)
        computeAllLayouts(store.graph, pageId)
        store.requestRender()
        store.select([rootId])
        store.flashNodes([rootId])

        toast.show(`✅ Stitch UI imported (${nodeCount} nodes)`)

        return { success: true, nodeId: rootId, nodeCount, screenId: result.screenId }
      } catch (err) {
        clearInterval(pulseInterval)
        store.graph.deleteNode(placeholder.id)
        store.requestRender()
        const msg = err instanceof Error ? err.message : 'Unknown error'
        toast.show(`Stitch generation failed: ${msg}`, 'error')
        return { success: false, error: msg }
      }
    },
  })

  const stitchImportScreen = tool({
    description: 'Import an existing screen from a Google Stitch project into the canvas. Fetches the screen HTML and converts it to design nodes.',
    parameters: valibotSchema(
      v.object({
        projectId: v.pipe(v.string(), v.description('Stitch project ID')),
        screenId: v.pipe(v.string(), v.description('Stitch screen ID to import')),
      })
    ),
    // @ts-expect-error -- valibotSchema doesn't properly infer execute param types for tool()
    // eslint-disable-next-line typescript/no-explicit-any -- valibotSchema doesn't infer execute params
    execute: async (args: any) => {
      const projectId: string | undefined = args?.projectId
      const screenId: string | undefined = args?.screenId
      void projectId // used for context, screenId is the key
      if (!screenId) {
        return { success: false, error: 'Missing required parameter: screenId' }
      }
      if (!batchActive) {
        batchBeforeSnapshot = store.snapshotPage()
        batchActive = true
      }

      toast.show('📥 Importing Stitch screen...')

      try {
        const code = await stitchClient.getScreenCode(screenId)
        if (!code.html) return { success: false, error: 'No HTML returned for screen' }

        const pageId = store.state.currentPageId
        const { rootId, nodeCount } = importStitchHtml(code.html, pageId, store.graph)
        computeAllLayouts(store.graph, pageId)
        store.requestRender()
        store.select([rootId])
        store.flashNodes([rootId])

        toast.show(`✅ Screen imported (${nodeCount} nodes)`)
        return { success: true, nodeId: rootId, nodeCount }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        toast.show(`Screen import failed: ${msg}`, 'error')
        return { success: false, error: msg }
      }
    },
  })

  const stitchListProjects = tool({
    description: 'List the user\'s Google Stitch projects. Returns project names and IDs for browsing or importing screens.',
    parameters: valibotSchema(v.object({})),
    execute: async () => {
      try {
        const projects = await stitchClient.listProjects()
        return { success: true, projects }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        return { success: false, error: msg, projects: [] }
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

  const tools = {
    ...coreTools,
    generate_image: generateImage,
    stitch_generate: stitchGenerate,
    stitch_import_screen: stitchImportScreen,
    stitch_list_projects: stitchListProjects,
  }
  return { tools, commitAIBatch }
}

export type AITools = ReturnType<typeof createAITools>
