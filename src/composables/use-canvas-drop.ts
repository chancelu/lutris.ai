import { useEventListener } from '@vueuse/core'
import { ref, type Ref } from 'vue'

import type { EditorStore } from '@/stores/editor'
import { toast } from '@/composables/use-toast'

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])

function isFigFile(file: File): boolean {
  return file.name.endsWith('.fig')
}

function hasAcceptedFiles(e: DragEvent): boolean {
  if (!e.dataTransfer?.types.includes('Files')) return false
  for (const item of e.dataTransfer.items) {
    if (item.kind === 'file') {
      if (ACCEPTED_TYPES.has(item.type)) return true
      // .fig files have no standard MIME type, check by extension later on drop
    }
  }
  // Allow drop if there are files (could be .fig with empty type)
  return e.dataTransfer.items.length > 0
}

export function useCanvasDrop(canvasRef: Ref<HTMLCanvasElement | null>, store: EditorStore) {
  const isDraggingOver = ref(false)

  useEventListener(canvasRef, 'dragover', (e: DragEvent) => {
    if (!hasAcceptedFiles(e)) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    isDraggingOver.value = true
  })

  useEventListener(canvasRef, 'dragenter', (e: DragEvent) => {
    if (!hasAcceptedFiles(e)) return
    e.preventDefault()
    isDraggingOver.value = true
  })

  useEventListener(canvasRef, 'dragleave', () => {
    isDraggingOver.value = false
  })

  useEventListener(canvasRef, 'drop', (e: DragEvent) => {
    e.preventDefault()
    isDraggingOver.value = false
    void handleDrop(e)
  })

  async function handleDrop(e: DragEvent) {

    const allFiles = e.dataTransfer?.files
    if (!allFiles?.length) return

    // Check for .fig files first
    const figFiles: File[] = []
    const imageFiles: File[] = []
    for (const file of allFiles) {
      if (isFigFile(file)) figFiles.push(file)
      else if (ACCEPTED_TYPES.has(file.type)) imageFiles.push(file)
    }

    // Handle .fig file import
    if (figFiles.length > 0) {
      if (figFiles[0].size > 2 * 1024 * 1024 * 1024) {
        toast.show('File too large. Maximum 2GB for .fig import.', 'error')
        return
      }
      try {
        if (figFiles[0].size > 50 * 1024 * 1024) {
          toast.show('Importing large file, this may take a moment...')
        }
        const { useAssetLibrary } = await import('@/composables/use-asset-library')
        const { loadLibrary } = useAssetLibrary()
        const library = await loadLibrary(figFiles[0])
        // Recursively copy a node and all its children from source graph to dest graph
        function deepImportNode(
          srcGraph: typeof library.graph,
          srcNodeId: string,
          destParentId: string,
        ) {
          const src = srcGraph.getNode(srcNodeId)
          if (!src) return
          const { id: _id, parentId: _pid, childIds: _cids, ...props } = src
          const created = store.graph.createNode(src.type, destParentId, props)
          for (const childId of src.childIds) {
            deepImportNode(srcGraph, childId, created.id)
          }
        }
        const importedGraph = library.graph
        const pages = importedGraph.getPages()
        let importedCount = 0
        if (pages.length > 0) {
          const topNodes = importedGraph.getChildren(pages[0].id)
          for (const srcNode of topNodes) {
            deepImportNode(importedGraph, srcNode.id, store.state.currentPageId)
            importedCount++
          }
          store.requestRender()
          setTimeout(() => store.zoomToFit(), 100)
        }
        toast.show(`Imported ${importedCount} top-level nodes from .fig file`)
      } catch (err) {
        toast.show(`Failed to import .fig: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
      }
      return
    }

    // Handle image files
    if (!imageFiles.length) return
    const canvas = canvasRef.value
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const { x: cx, y: cy } = store.screenToCanvas(sx, sy)

    void store.placeImageFiles(imageFiles, cx, cy)
  }

  return { isDraggingOver }
}

export function extractImageFilesFromClipboard(e: ClipboardEvent): File[] {
  const files = e.clipboardData?.files ?? null
  if (!files) return []
  const result: File[] = []
  for (const file of files) {
    if (ACCEPTED_TYPES.has(file.type)) result.push(file)
  }
  return result
}
