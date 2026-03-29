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

  useEventListener(canvasRef, 'drop', async (e: DragEvent) => {
    e.preventDefault()
    isDraggingOver.value = false

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
      try {
        const { useAssetLibrary } = await import('@/composables/use-asset-library')
        const { loadLibrary } = useAssetLibrary()
        await loadLibrary(figFiles[0])
        toast.show('Figma file imported successfully', 'success')
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
  })

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
