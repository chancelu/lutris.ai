import { useEventListener } from '@vueuse/core'
import { ref, type Ref } from 'vue'

import type { EditorStore } from '@/stores/editor'

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])

function hasAcceptedFiles(e: DragEvent): boolean {
  if (!e.dataTransfer?.types.includes('Files')) return false
  for (const item of e.dataTransfer.items) {
    if (item.kind === 'file' && ACCEPTED_TYPES.has(item.type)) return true
  }
  return false
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

    const imageFiles: File[] = []
    for (const file of allFiles) {
      if (ACCEPTED_TYPES.has(file.type)) imageFiles.push(file)
    }

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
