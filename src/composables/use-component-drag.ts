import { ref } from 'vue'

// ── Component Drag & Drop ──
// Enables dragging saved components from the library onto the canvas

export interface DragPayload {
  type: 'component'
  componentId: string
  nodeData: string
}

const isDragging = ref(false)
const dragPayload = ref<DragPayload | null>(null)
const dragPosition = ref({ x: 0, y: 0 })

function startDrag(payload: DragPayload, event: DragEvent) {
  isDragging.value = true
  dragPayload.value = payload

  // Set drag data for native HTML5 drag
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/designflow-component', JSON.stringify(payload))

    // Create a small drag image
    const ghost = document.createElement('div')
    ghost.textContent = '🧩'
    ghost.style.cssText = 'position:fixed;top:-100px;font-size:24px;'
    document.body.appendChild(ghost)
    event.dataTransfer.setDragImage(ghost, 12, 12)
    requestAnimationFrame(() => ghost.remove())
  }
}

function updateDragPosition(x: number, y: number) {
  dragPosition.value = { x, y }
}

function endDrag() {
  isDragging.value = false
  dragPayload.value = null
}

function handleCanvasDrop(
  event: DragEvent,
  canvasRect: DOMRect,
  zoom: number,
  panX: number,
  panY: number
): DragPayload | null {
  const data = event.dataTransfer?.getData('application/designflow-component')
  if (!data) return null

  try {
    const payload = JSON.parse(data) as DragPayload

    // Convert screen coords to canvas coords
    const sx = event.clientX - canvasRect.left
    const sy = event.clientY - canvasRect.top
    const cx = (sx - panX) / zoom
    const cy = (sy - panY) / zoom

    // Update position in payload
    return { ...payload, nodeData: addPositionToNodeData(payload.nodeData, cx, cy) }
  } catch {
    return null
  }
}

function addPositionToNodeData(nodeData: string, x: number, y: number): string {
  try {
    const nodes = JSON.parse(nodeData)
    if (Array.isArray(nodes) && nodes.length > 0) {
      nodes[0].x = x
      nodes[0].y = y
    }
    return JSON.stringify(nodes)
  } catch {
    return nodeData
  }
}

export function useComponentDrag() {
  return {
    isDragging,
    dragPayload,
    dragPosition,
    startDrag,
    updateDragPosition,
    endDrag,
    handleCanvasDrop,
  }
}
