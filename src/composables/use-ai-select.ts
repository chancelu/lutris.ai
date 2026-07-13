import { ref, computed } from 'vue'
import type { Rect } from '@llc3233149/core'
import { useEditorStore } from '@/stores/editor'

export interface AISelectionContext {
  nodeId: string
  name: string
  type: string
  bounds: Rect
  jsx?: string
  properties?: Record<string, unknown>
}

const selectedForAI = ref<AISelectionContext[]>([])
const aiSelectMode = ref(false)

export function useAISelect() {
  const store = useEditorStore()

  function toggleAISelectMode() {
    aiSelectMode.value = !aiSelectMode.value
  }

  function addNodeToAIContext(nodeId: string) {
    if (selectedForAI.value.some(s => s.nodeId === nodeId)) return

    const node = store.graph.nodes.get(nodeId)
    if (!node) return

    const bounds = store.graph.getAbsoluteBounds(nodeId)

    const ctx: AISelectionContext = {
      nodeId,
      name: node.name || node.type,
      type: node.type,
      bounds: bounds,
    }

    // Try to get JSX representation for richer context
    try {
      const jsx = (store.graph as unknown as { toJSX?: (id: string) => string }).toJSX?.(nodeId)
      if (jsx) ctx.jsx = jsx
    } catch { /* not all nodes support JSX export */ }

    // Extract key visual properties
    const childCount = 'children' in node && Array.isArray(node.children) ? node.children.length : 0
    ctx.properties = {
      width: node.width,
      height: node.height,
      fills: node.fills,
      strokes: node.strokes,
      cornerRadius: node.cornerRadius,
      opacity: node.opacity,
      children: childCount,
    }

    selectedForAI.value.push(ctx)
  }

  function removeFromAIContext(nodeId: string) {
    selectedForAI.value = selectedForAI.value.filter(s => s.nodeId !== nodeId)
  }

  function clearAIContext() {
    selectedForAI.value = []
  }

  function buildContextPrompt(): string {
    if (selectedForAI.value.length === 0) return ''

    const parts = selectedForAI.value.map(s => {
      let desc = `[Selected: "${s.name}" (${s.type}, ${s.bounds.width}×${s.bounds.height}px at ${s.bounds.x},${s.bounds.y})]`
      const kids = s.properties?.children
      if (kids != null && typeof kids === 'number' && kids > 0) {
        desc += ` — ${String(kids)} children`
      }
      if (s.jsx) {
        desc += `\nCurrent JSX:\n\`\`\`jsx\n${s.jsx}\n\`\`\``
      }
      return desc
    })

    return `\n\n--- Selected elements for modification ---\n${parts.join('\n\n')}\n---\n\nModify ONLY the selected elements above. Keep everything else unchanged.`
  }

  function addCurrentSelection() {
    const ids = store.state.selectedIds
    if (ids instanceof Set) {
      for (const id of ids) addNodeToAIContext(id)
    }
  }

  function addNodesInRect(rect: Rect) {
    const pageId = store.state.currentPageId
    if (!pageId) return
    const page = store.graph.nodes.get(pageId)
    if (!page) return
    const childIds = (page as unknown as { children?: string[] }).children
    if (!childIds) return

    for (const childId of childIds) {
      const bounds = store.graph.getAbsoluteBounds(childId)
      if (
        bounds.x < rect.x + rect.width &&
        bounds.x + bounds.width > rect.x &&
        bounds.y < rect.y + rect.height &&
        bounds.y + bounds.height > rect.y
      ) {
        addNodeToAIContext(childId)
      }
    }
  }

  const hasContext = computed(() => selectedForAI.value.length > 0)
  const contextCount = computed(() => selectedForAI.value.length)

  return {
    aiSelectMode,
    selectedForAI,
    hasContext,
    contextCount,
    toggleAISelectMode,
    addNodeToAIContext,
    addCurrentSelection,
    addNodesInRect,
    removeFromAIContext,
    clearAIContext,
    buildContextPrompt,
  }
}
