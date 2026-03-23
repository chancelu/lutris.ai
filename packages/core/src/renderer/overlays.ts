import {
  ROTATION_HANDLE_OFFSET,
  ROTATION_HANDLE_RADIUS,
  HANDLE_HALF_SIZE,
  LABEL_OFFSET_Y,
  MEASUREMENT_COLOR,
  MEASUREMENT_LINE_WIDTH,
  MEASUREMENT_PILL_HEIGHT,
  MEASUREMENT_PILL_PADDING_X,
  MEASUREMENT_PILL_RADIUS,
  MEASUREMENT_FONT_SIZE,
  MEASUREMENT_DASH,
  MEASUREMENT_ARROW_SIZE,
  SIZE_PILL_PADDING_X,
  SIZE_PILL_PADDING_Y,
  SIZE_PILL_HEIGHT,
  SIZE_PILL_RADIUS,
  SIZE_PILL_TEXT_OFFSET_Y,
  MARQUEE_FILL_ALPHA,
  SELECTION_DASH_ALPHA,
  LAYOUT_INDICATOR_STROKE,
  PEN_HANDLE_RADIUS,
  PEN_VERTEX_RADIUS,
  PEN_CLOSE_RADIUS_BOOST,
  TEXT_SELECTION_COLOR,
  TEXT_CARET_COLOR,
  TEXT_CARET_WIDTH,
  FLASH_COLOR,
  FLASH_ATTACK_MS,
  FLASH_HOLD_MS,
  FLASH_RELEASE_MS,
  FLASH_STROKE_WIDTH,
  FLASH_PADDING,
  FLASH_OVERSHOOT,
  FLASH_RADIUS
} from '../constants'
import type { SceneNode, SceneGraph } from '../scene-graph'
import type { SnapGuide } from '../snap'
import type { TextEditor } from '../text-editor'
import type { Rect, Vector } from '../types'
import type { Canvas, Paint } from 'canvaskit-wasm'
import type { SkiaRenderer, RenderOverlays } from './renderer'

export function drawHoverHighlight(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  hoveredNodeId?: string | null
): void {
  if (!hoveredNodeId) return
  const node = graph.getNode(hoveredNodeId)
  if (!node) return

  const abs = graph.getAbsolutePosition(node.id)
  const sx = abs.x * r.zoom + r.panX
  const sy = abs.y * r.zoom + r.panY

  r.auxStroke.setStrokeWidth(1 / r.zoom)
  r.auxStroke.setColor(
    r.isComponentType(node.type) ? r.compColor() : r.selColor()
  )
  r.auxStroke.setPathEffect(null)

  canvas.save()
  canvas.translate(sx, sy)
  if (node.rotation !== 0) {
    const cx = (node.width / 2) * r.zoom
    const cy = (node.height / 2) * r.zoom
    canvas.rotate(node.rotation, cx, cy)
  }
  canvas.scale(r.zoom, r.zoom)
  r.strokeNodeShape(canvas, node, r.auxStroke)
  canvas.restore()
}

export function drawSelection(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: Set<string>,
  overlays: RenderOverlays
): void {
  if (selectedIds.size === 0) return

  r.drawParentFrameOutlines(canvas, graph, selectedIds)

  if (selectedIds.size === 1) {
    const id = [...selectedIds][0]
    if (overlays.editingTextId === id) return
    const node = graph.getNode(id)
    if (!node) return

    const useComponentColor = r.isComponentType(node.type)
    r.selectionPaint.setColor(useComponentColor ? r.compColor() : r.selColor())
    r.selectionPaint.setStrokeWidth(1)

    const rotation =
      overlays.rotationPreview?.nodeId === id ? overlays.rotationPreview.angle : node.rotation
    r.drawNodeSelection(canvas, node, rotation, graph)
    r.drawSelectionLabels(canvas, graph, selectedIds)

    r.selectionPaint.setColor(r.selColor())
    return
  }

  for (const id of selectedIds) {
    const node = graph.getNode(id)
    if (!node) continue

    const useComponentColor = r.isComponentType(node.type)
    r.selectionPaint.setColor(useComponentColor ? r.compColor() : r.selColor())
    r.selectionPaint.setStrokeWidth(1)

    const rotation =
      overlays.rotationPreview?.nodeId === id ? overlays.rotationPreview.angle : node.rotation
    r.drawNodeOutline(canvas, node, rotation, graph)
  }

  r.selectionPaint.setColor(r.selColor())

  const nodes = [...selectedIds]
    .map((id) => graph.getNode(id))
    .filter((n): n is SceneNode => n !== undefined)
  r.drawGroupBounds(canvas, nodes, graph)

  r.drawSelectionLabels(canvas, graph, selectedIds)
}

export function drawNodeSelection(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  rotation: number,
  graph: SceneGraph
): void {
  const abs = graph.getAbsolutePosition(node.id)
  const cx = (abs.x + node.width / 2) * r.zoom + r.panX
  const cy = (abs.y + node.height / 2) * r.zoom + r.panY
  const hw = (node.width / 2) * r.zoom
  const hh = (node.height / 2) * r.zoom

  canvas.save()
  if (rotation !== 0) {
    canvas.rotate(rotation, cx, cy)
  }

  const x1 = cx - hw
  const y1 = cy - hh
  const x2 = cx + hw
  const y2 = cy + hh

  canvas.drawRect(r.ck.LTRBRect(x1, y1, x2, y2), r.selectionPaint)

  r.drawHandle(canvas, x1, y1)
  r.drawHandle(canvas, x2, y1)
  r.drawHandle(canvas, x1, y2)
  r.drawHandle(canvas, x2, y2)

  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  r.drawHandle(canvas, mx, y1)
  r.drawHandle(canvas, mx, y2)
  r.drawHandle(canvas, x1, my)
  r.drawHandle(canvas, x2, my)

  const rotHandleY = y1 - ROTATION_HANDLE_OFFSET - ROTATION_HANDLE_RADIUS
  r.auxStroke.setStrokeWidth(1)
  r.auxStroke.setColor(r.selColor())
  r.auxStroke.setPathEffect(null)
  canvas.drawLine(mx, y1, mx, rotHandleY, r.auxStroke)

  r.auxFill.setColor(r.ck.WHITE)
  canvas.drawCircle(mx, rotHandleY, ROTATION_HANDLE_RADIUS, r.auxFill)
  canvas.drawCircle(mx, rotHandleY, ROTATION_HANDLE_RADIUS, r.auxStroke)

  canvas.restore()
}

export function drawSelectionLabels(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: Set<string>
): void {
  if (!r.labelFont || !r.sizeFont) return

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const nodes: SceneNode[] = []

  for (const id of selectedIds) {
    const node = graph.getNode(id)
    if (!node) continue
    nodes.push(node)
    const abs = graph.getAbsolutePosition(id)
    minX = Math.min(minX, abs.x)
    minY = Math.min(minY, abs.y)
    maxX = Math.max(maxX, abs.x + node.width)
    maxY = Math.max(maxY, abs.y + node.height)
  }

  if (nodes.length === 0) return

  const sx1 = minX * r.zoom + r.panX
  const sy1 = minY * r.zoom + r.panY
  const sx2 = maxX * r.zoom + r.panX
  const sy2 = maxY * r.zoom + r.panY
  const smx = (sx1 + sx2) / 2

  if (nodes.length === 1) {
    const node = nodes[0]
    const parentNode = node.parentId ? graph.getNode(node.parentId) : null
    const isTopLevel =
      !parentNode || parentNode.type === 'CANVAS' || parentNode.type === 'SECTION'
    if (node.type === 'FRAME' && isTopLevel) {
      r.auxFill.setColor(r.selColor())
      canvas.drawText(node.name, sx1, sy1 - LABEL_OFFSET_Y, r.auxFill, r.labelFont)
    }
  }

  const w = Math.round(maxX - minX)
  const h = Math.round(maxY - minY)
  const sizeText = `${w} × ${h}`
  const glyphIds = r.sizeFont.getGlyphIDs(sizeText)
  const widths = r.sizeFont.getGlyphWidths(glyphIds)
  let textWidth = 0
  for (const w of widths) textWidth += w
  const pillW = textWidth + SIZE_PILL_PADDING_X * 2
  const pillH = SIZE_PILL_HEIGHT
  const pillX = smx - pillW / 2
  const pillY = sy2 + SIZE_PILL_PADDING_Y

  const allComponents = nodes.length > 0 && nodes.every((n) => r.isComponentType(n.type))
  const pillColor = allComponents ? r.compColor() : r.selColor()

  r.auxFill.setColor(pillColor)
  const rrect = r.ck.RRectXY(
    r.ck.LTRBRect(pillX, pillY, pillX + pillW, pillY + pillH),
    SIZE_PILL_RADIUS,
    SIZE_PILL_RADIUS
  )
  canvas.drawRRect(rrect, r.auxFill)

  r.auxFill.setColor(r.ck.WHITE)
  canvas.drawText(
    sizeText,
    pillX + SIZE_PILL_PADDING_X,
    pillY + SIZE_PILL_TEXT_OFFSET_Y,
    r.auxFill,
    r.sizeFont
  )
}

export function drawParentFrameOutlines(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: Set<string>
): void {
  const drawn = new Set<string>()
  for (const id of selectedIds) {
    const node = graph.getNode(id)
    if (!node?.parentId) continue
    const nodeParent = graph.getNode(node.parentId)
    if (!nodeParent || nodeParent.type === 'CANVAS') continue
    if (drawn.has(node.parentId) || selectedIds.has(node.parentId)) continue

    const parent = nodeParent

    const grandparent = parent.parentId ? graph.getNode(parent.parentId) : null
    if (!grandparent || grandparent.type === 'CANVAS') continue

    drawn.add(node.parentId)

    const abs = graph.getAbsolutePosition(parent.id)
    const x = abs.x * r.zoom + r.panX
    const y = abs.y * r.zoom + r.panY
    const w = parent.width * r.zoom
    const h = parent.height * r.zoom

    canvas.save()
    if (parent.rotation !== 0) {
      canvas.rotate(parent.rotation, x + w / 2, y + h / 2)
    }
    canvas.drawRect(r.ck.LTRBRect(x, y, x + w, y + h), r.parentOutlinePaint)
    canvas.restore()
  }
}

export function drawNodeOutline(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  rotation: number,
  graph: SceneGraph
): void {
  const abs = graph.getAbsolutePosition(node.id)
  const cx = (abs.x + node.width / 2) * r.zoom + r.panX
  const cy = (abs.y + node.height / 2) * r.zoom + r.panY
  const hw = (node.width / 2) * r.zoom
  const hh = (node.height / 2) * r.zoom

  canvas.save()
  if (rotation !== 0) {
    canvas.rotate(rotation, cx, cy)
  }

  canvas.drawRect(r.ck.LTRBRect(cx - hw, cy - hh, cx + hw, cy + hh), r.selectionPaint)
  canvas.restore()
}

export function drawGroupBounds(
  r: SkiaRenderer,
  canvas: Canvas,
  nodes: SceneNode[],
  graph: SceneGraph
): void {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const n of nodes) {
    const abs = graph.getAbsolutePosition(n.id)
    if (n.rotation !== 0) {
      const corners = r.getRotatedCorners(n, abs)
      for (const c of corners) {
        minX = Math.min(minX, c.x)
        minY = Math.min(minY, c.y)
        maxX = Math.max(maxX, c.x)
        maxY = Math.max(maxY, c.y)
      }
    } else {
      const x1 = abs.x * r.zoom + r.panX
      const y1 = abs.y * r.zoom + r.panY
      const x2 = (abs.x + n.width) * r.zoom + r.panX
      const y2 = (abs.y + n.height) * r.zoom + r.panY
      minX = Math.min(minX, x1)
      minY = Math.min(minY, y1)
      maxX = Math.max(maxX, x2)
      maxY = Math.max(maxY, y2)
    }
  }

  r.auxStroke.setStrokeWidth(1)
  r.auxStroke.setColor(r.selColor(SELECTION_DASH_ALPHA))
  r.auxStroke.setPathEffect(null)

  canvas.drawRect(r.ck.LTRBRect(minX, minY, maxX, maxY), r.auxStroke)

  r.drawHandle(canvas, minX, minY)
  r.drawHandle(canvas, maxX, minY)
  r.drawHandle(canvas, minX, maxY)
  r.drawHandle(canvas, maxX, maxY)
  const gmx = (minX + maxX) / 2
  const gmy = (minY + maxY) / 2
  r.drawHandle(canvas, gmx, minY)
  r.drawHandle(canvas, gmx, maxY)
  r.drawHandle(canvas, minX, gmy)
  r.drawHandle(canvas, maxX, gmy)
}

export function getRotatedCorners(
  r: SkiaRenderer,
  n: SceneNode,
  abs: Vector
): Vector[] {
  const cx = (abs.x + n.width / 2) * r.zoom + r.panX
  const cy = (abs.y + n.height / 2) * r.zoom + r.panY
  const hw = (n.width / 2) * r.zoom
  const hh = (n.height / 2) * r.zoom
  const rad = (n.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  return [
    { x: cx + -hw * cos - -hh * sin, y: cy + -hw * sin + -hh * cos },
    { x: cx + hw * cos - -hh * sin, y: cy + hw * sin + -hh * cos },
    { x: cx + hw * cos - hh * sin, y: cy + hw * sin + hh * cos },
    { x: cx + -hw * cos - hh * sin, y: cy + -hw * sin + hh * cos }
  ]
}

export function drawHandle(r: SkiaRenderer, canvas: Canvas, x: number, y: number): void {
  r.auxFill.setColor(r.ck.WHITE)
  const rect = r.ck.LTRBRect(
    x - HANDLE_HALF_SIZE,
    y - HANDLE_HALF_SIZE,
    x + HANDLE_HALF_SIZE,
    y + HANDLE_HALF_SIZE
  )
  canvas.drawRect(rect, r.auxFill)
  canvas.drawRect(rect, r.selectionPaint)
}

export function drawSnapGuides(
  r: SkiaRenderer,
  canvas: Canvas,
  guides?: SnapGuide[]
): void {
  if (!guides || guides.length === 0) return

  for (const guide of guides) {
    if (guide.axis === 'x') {
      const x = guide.position * r.zoom + r.panX
      const y1 = guide.from * r.zoom + r.panY
      const y2 = guide.to * r.zoom + r.panY
      canvas.drawLine(x, y1, x, y2, r.snapPaint)
    } else {
      const y = guide.position * r.zoom + r.panY
      const x1 = guide.from * r.zoom + r.panX
      const x2 = guide.to * r.zoom + r.panX
      canvas.drawLine(x1, y, x2, y, r.snapPaint)
    }
  }
}

export function drawMarquee(r: SkiaRenderer, canvas: Canvas, marquee?: Rect | null): void {
  if (!marquee || marquee.width <= 0 || marquee.height <= 0) return

  const x1 = marquee.x * r.zoom + r.panX
  const y1 = marquee.y * r.zoom + r.panY
  const x2 = (marquee.x + marquee.width) * r.zoom + r.panX
  const y2 = (marquee.y + marquee.height) * r.zoom + r.panY
  const rect = r.ck.LTRBRect(x1, y1, x2, y2)

  r.auxFill.setColor(r.selColor(MARQUEE_FILL_ALPHA))
  canvas.drawRect(rect, r.auxFill)
  canvas.drawRect(rect, r.selectionPaint)
}

export function drawFlashes(r: SkiaRenderer, canvas: Canvas, graph: SceneGraph): void {
  if (r._flashes.length === 0) return

  const now = performance.now()
  const ck = r.ck
  const totalMs = FLASH_ATTACK_MS + FLASH_HOLD_MS + FLASH_RELEASE_MS

  if (!r._flashPaint) {
    r._flashPaint = new ck.Paint()
    r._flashPaint.setStyle(ck.PaintStyle.Stroke)
    r._flashPaint.setAntiAlias(true)
  }

  const paint = r._flashPaint
  const zoom = r.zoom

  for (let i = r._flashes.length - 1; i >= 0; i--) {
    const flash = r._flashes[i]
    const elapsed = now - flash.startTime
    if (elapsed > totalMs) {
      r._flashes.splice(i, 1)
      continue
    }

    const node = graph.getNode(flash.nodeId)
    if (!node) {
      r._flashes.splice(i, 1)
      continue
    }

    const abs = graph.getAbsolutePosition(flash.nodeId)
    const cx = (abs.x + node.width / 2) * zoom + r.panX
    const cy = (abs.y + node.height / 2) * zoom + r.panY
    const hw = (node.width / 2) * zoom
    const hh = (node.height / 2) * zoom

    let opacity: number
    let extraPad: number

    if (elapsed < FLASH_ATTACK_MS) {
      const t = elapsed / FLASH_ATTACK_MS
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      opacity = ease
      extraPad = (1 - ease) * FLASH_OVERSHOOT
    } else if (elapsed < FLASH_ATTACK_MS + FLASH_HOLD_MS) {
      opacity = 1
      extraPad = 0
    } else {
      const t = (elapsed - FLASH_ATTACK_MS - FLASH_HOLD_MS) / FLASH_RELEASE_MS
      opacity = 1 - t * t
      extraPad = 0
    }

    const pad = FLASH_PADDING + extraPad
    const rad = FLASH_RADIUS

    paint.setColor(ck.Color4f(FLASH_COLOR.r, FLASH_COLOR.g, FLASH_COLOR.b, opacity))
    paint.setStrokeWidth(FLASH_STROKE_WIDTH)

    canvas.save()
    if (node.rotation !== 0) canvas.rotate(node.rotation, cx, cy)

    const rect = ck.RRectXY(
      ck.LTRBRect(cx - hw - pad, cy - hh - pad, cx + hw + pad, cy + hh + pad),
      rad,
      rad
    )
    canvas.drawRRect(rect, paint)
    canvas.restore()
  }
}

export function drawLayoutInsertIndicator(
  r: SkiaRenderer,
  canvas: Canvas,
  indicator?: RenderOverlays['layoutInsertIndicator']
): void {
  if (!indicator) return

  r.auxStroke.setStrokeWidth(LAYOUT_INDICATOR_STROKE)
  r.auxStroke.setColor(r.selColor())
  r.auxStroke.setPathEffect(null)

  if (indicator.direction === 'HORIZONTAL') {
    const y = indicator.y * r.zoom + r.panY
    const x1 = indicator.x * r.zoom + r.panX
    const x2 = (indicator.x + indicator.length) * r.zoom + r.panX
    canvas.drawLine(x1, y, x2, y, r.auxStroke)
  } else {
    const x = indicator.x * r.zoom + r.panX
    const y1 = indicator.y * r.zoom + r.panY
    const y2 = (indicator.y + indicator.length) * r.zoom + r.panY
    canvas.drawLine(x, y1, x, y2, r.auxStroke)
  }
}

export function drawTextEditOverlay(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  editor: TextEditor
): void {
  r.auxStroke.setStrokeWidth(1 / r.zoom)
  r.auxStroke.setColor(r.selColor())
  r.auxStroke.setPathEffect(null)
  canvas.drawRect(r.ck.LTRBRect(0, 0, node.width, node.height), r.auxStroke)

  const selRects = editor.getSelectionRects()
  if (selRects.length > 0) {
    r.auxFill.setColor(
      r.ck.Color4f(
        TEXT_SELECTION_COLOR.r,
        TEXT_SELECTION_COLOR.g,
        TEXT_SELECTION_COLOR.b,
        TEXT_SELECTION_COLOR.a
      )
    )
    for (const sel of selRects) {
      canvas.drawRect(
        r.ck.LTRBRect(sel.x, sel.y, sel.x + sel.width, sel.y + sel.height),
        r.auxFill
      )
    }
  }

  if (editor.caretVisible && !editor.hasSelection()) {
    const caret = editor.getCaretRect()
    if (caret) {
      r.auxFill.setColor(
        r.ck.Color4f(
          TEXT_CARET_COLOR.r,
          TEXT_CARET_COLOR.g,
          TEXT_CARET_COLOR.b,
          TEXT_CARET_COLOR.a
        )
      )
      const w = TEXT_CARET_WIDTH / r.zoom
      canvas.drawRect(
        r.ck.LTRBRect(caret.x - w / 2, caret.y0, caret.x + w / 2, caret.y1),
        r.auxFill
      )
    }
  }
}

type ToScreenFn = (x: number, y: number) => Vector

function buildPenPath(
  r: SkiaRenderer,
  canvas: Canvas,
  penState: NonNullable<RenderOverlays['penState']>,
  toScreen: ToScreenFn
): void {
  const { vertices, segments, dragTangent, cursorX, cursorY } = penState

  const path = new r.ck.Path()
  for (const seg of segments) {
    const s = toScreen(vertices[seg.start].x, vertices[seg.start].y)
    const e = toScreen(vertices[seg.end].x, vertices[seg.end].y)
    path.moveTo(s.x, s.y)

    const isLine =
      seg.tangentStart.x === 0 &&
      seg.tangentStart.y === 0 &&
      seg.tangentEnd.x === 0 &&
      seg.tangentEnd.y === 0
    if (isLine) {
      path.lineTo(e.x, e.y)
    } else {
      const cp1 = toScreen(
        vertices[seg.start].x + seg.tangentStart.x,
        vertices[seg.start].y + seg.tangentStart.y
      )
      const cp2 = toScreen(
        vertices[seg.end].x + seg.tangentEnd.x,
        vertices[seg.end].y + seg.tangentEnd.y
      )
      path.cubicTo(cp1.x, cp1.y, cp2.x, cp2.y, e.x, e.y)
    }
  }

  if (vertices.length > 0 && cursorX != null && cursorY != null) {
    const last = toScreen(vertices[vertices.length - 1].x, vertices[vertices.length - 1].y)
    const cursor = toScreen(cursorX, cursorY)
    path.moveTo(last.x, last.y)
    if (dragTangent) {
      const cp1 = toScreen(
        vertices[vertices.length - 1].x + dragTangent.x,
        vertices[vertices.length - 1].y + dragTangent.y
      )
      path.cubicTo(cp1.x, cp1.y, cursor.x, cursor.y, cursor.x, cursor.y)
    } else {
      path.lineTo(cursor.x, cursor.y)
    }
  }

  canvas.drawPath(path, r.penPathPaint)
  path.delete()
}

function drawPenHandlePoint(
  canvas: Canvas,
  x: number,
  y: number,
  vertexFill: Paint,
  handlePaint: Paint
): void {
  canvas.drawCircle(x, y, PEN_HANDLE_RADIUS, vertexFill)
  canvas.drawCircle(x, y, PEN_HANDLE_RADIUS, handlePaint)
}

function drawPenTangentHandles(
  canvas: Canvas,
  penState: NonNullable<RenderOverlays['penState']>,
  toScreen: ToScreenFn,
  handlePaint: Paint,
  vertexFill: Paint
): void {
  const { vertices, segments, dragTangent } = penState

  for (const seg of segments) {
    const ts = seg.tangentStart
    const te = seg.tangentEnd
    if (ts.x !== 0 || ts.y !== 0) {
      const s = toScreen(vertices[seg.start].x, vertices[seg.start].y)
      const cp = toScreen(vertices[seg.start].x + ts.x, vertices[seg.start].y + ts.y)
      canvas.drawLine(s.x, s.y, cp.x, cp.y, handlePaint)
      drawPenHandlePoint(canvas, cp.x, cp.y, vertexFill, handlePaint)
    }
    if (te.x !== 0 || te.y !== 0) {
      const e = toScreen(vertices[seg.end].x, vertices[seg.end].y)
      const cp = toScreen(vertices[seg.end].x + te.x, vertices[seg.end].y + te.y)
      canvas.drawLine(e.x, e.y, cp.x, cp.y, handlePaint)
      drawPenHandlePoint(canvas, cp.x, cp.y, vertexFill, handlePaint)
    }
  }

  if (dragTangent && vertices.length > 0) {
    const last = vertices[vertices.length - 1]
    const cp1 = toScreen(last.x + dragTangent.x, last.y + dragTangent.y)
    const cp2 = toScreen(last.x - dragTangent.x, last.y - dragTangent.y)
    canvas.drawLine(cp2.x, cp2.y, cp1.x, cp1.y, handlePaint)
    drawPenHandlePoint(canvas, cp1.x, cp1.y, vertexFill, handlePaint)
    drawPenHandlePoint(canvas, cp2.x, cp2.y, vertexFill, handlePaint)
  }
}

export function drawPenOverlay(
  r: SkiaRenderer,
  canvas: Canvas,
  penState: RenderOverlays['penState']
): void {
  if (!penState || penState.vertices.length === 0) return

  const { vertices } = penState
  const vertexFill = r.penVertexFill
  const vertexStroke = r.penVertexStroke

  const toScreen: ToScreenFn = (x, y) => ({
    x: x * r.zoom + r.panX,
    y: y * r.zoom + r.panY
  })

  buildPenPath(r, canvas, penState, toScreen)
  drawPenTangentHandles(canvas, penState, toScreen, r.penHandlePaint, vertexFill)

  for (let i = 0; i < vertices.length; i++) {
    const v = toScreen(vertices[i].x, vertices[i].y)
    const radius =
      i === 0 && penState.closingToFirst
        ? PEN_VERTEX_RADIUS + PEN_CLOSE_RADIUS_BOOST
        : PEN_VERTEX_RADIUS
    canvas.drawCircle(v.x, v.y, radius, vertexFill)
    canvas.drawCircle(v.x, v.y, radius, vertexStroke)
  }
}

export function drawRemoteCursors(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  cursors?: RenderOverlays['remoteCursors']
): void {
  if (!cursors || cursors.length === 0) return

  const CURSOR_SIZE = 9
  const LABEL_PADDING_X = 4
  const LABEL_PADDING_Y = 2
  const LABEL_FONT_SIZE = 10
  const LABEL_OFFSET_X = 12
  const LABEL_OFFSET_Y = 20

  for (const cursor of cursors) {
    const screenX = cursor.x * r.zoom + r.panX
    const screenY = cursor.y * r.zoom + r.panY
    const { r: cr, g, b } = cursor.color

    if (cursor.selection?.length) {
      r.auxStroke.setColor(r.ck.Color4f(cr, g, b, 0.6))
      r.auxStroke.setStrokeWidth(1.5)
      r.auxStroke.setPathEffect(null)
      for (const nodeId of cursor.selection) {
        const node = graph.getNode(nodeId)
        if (!node) continue
        const abs = graph.getAbsolutePosition(nodeId)
        const sx = abs.x * r.zoom + r.panX
        const sy = abs.y * r.zoom + r.panY
        const sw = node.width * r.zoom
        const sh = node.height * r.zoom
        canvas.drawRect(r.ck.XYWHRect(sx, sy, sw, sh), r.auxStroke)
      }
    }

    const S = CURSOR_SIZE
    const path = new r.ck.Path()
    path.moveTo(screenX, screenY)
    path.lineTo(screenX, screenY + S * 1.35)
    path.lineTo(screenX + S * 0.38, screenY + S * 1.0)
    path.lineTo(screenX + S * 0.72, screenY + S * 1.5)
    path.lineTo(screenX + S * 0.92, screenY + S * 1.38)
    path.lineTo(screenX + S * 0.58, screenY + S * 0.88)
    path.lineTo(screenX + S * 1.0, screenY + S * 0.82)
    path.close()

    r.auxStroke.setColor(r.ck.Color4f(1, 1, 1, 1))
    r.auxStroke.setStrokeWidth(2)
    r.auxStroke.setPathEffect(null)
    canvas.drawPath(path, r.auxStroke)

    r.auxFill.setColor(r.ck.Color4f(cr, g, b, 1))
    canvas.drawPath(path, r.auxFill)
    path.delete()

    if (cursor.name) {
      const font = r.labelFont
      if (font) {
        font.setSize(LABEL_FONT_SIZE)
        const labelX = screenX + LABEL_OFFSET_X
        const labelY = screenY + LABEL_OFFSET_Y
        const glyphIds = font.getGlyphIDs(cursor.name)
        const widths = font.getGlyphWidths(glyphIds)
        let textWidth = 0
        for (const w of widths) textWidth += w

        r.auxFill.setColor(r.ck.Color4f(cr, g, b, 1))
        const bgRect = r.ck.RRectXY(
          r.ck.XYWHRect(
            labelX - LABEL_PADDING_X,
            labelY - LABEL_FONT_SIZE - LABEL_PADDING_Y + 2,
            textWidth + LABEL_PADDING_X * 2,
            LABEL_FONT_SIZE + LABEL_PADDING_Y * 2
          ),
          4,
          4
        )
        canvas.drawRRect(bgRect, r.auxFill)

        r.auxFill.setColor(r.ck.Color4f(1, 1, 1, 1))
        canvas.drawText(cursor.name, labelX, labelY, r.auxFill, font)
      }
    }
  }
}

// ── Measurement / Redline Overlay ──

interface MeasurementBounds {
  x1: number
  y1: number
  x2: number
  y2: number
}

function nodeBounds(graph: SceneGraph, id: string, node: SceneNode): MeasurementBounds {
  const abs = graph.getAbsolutePosition(id)
  return {
    x1: abs.x,
    y1: abs.y,
    x2: abs.x + node.width,
    y2: abs.y + node.height,
  }
}

function drawMeasurementLine(
  _r: SkiaRenderer,
  canvas: Canvas,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  paint: Paint
): void {
  canvas.drawLine(x1, y1, x2, y2, paint)
  // Draw small perpendicular end caps
  const isHorizontal = Math.abs(y2 - y1) < 0.5
  const cap = MEASUREMENT_ARROW_SIZE
  if (isHorizontal) {
    canvas.drawLine(x1, y1 - cap, x1, y1 + cap, paint)
    canvas.drawLine(x2, y2 - cap, x2, y2 + cap, paint)
  } else {
    canvas.drawLine(x1 - cap, y1, x1 + cap, y1, paint)
    canvas.drawLine(x2 - cap, y2, x2 + cap, y2, paint)
  }
}

function drawMeasurementPill(
  r: SkiaRenderer,
  canvas: Canvas,
  cx: number,
  cy: number,
  text: string
): void {
  const font = r.sizeFont
  if (!font) return

  font.setSize(MEASUREMENT_FONT_SIZE)
  const glyphIds = font.getGlyphIDs(text)
  const widths = font.getGlyphWidths(glyphIds)
  let textWidth = 0
  for (const w of widths) textWidth += w

  const pw = textWidth + MEASUREMENT_PILL_PADDING_X * 2
  const ph = MEASUREMENT_PILL_HEIGHT
  const px = cx - pw / 2
  const py = cy - ph / 2

  // Background pill
  r.auxFill.setColor(
    r.ck.Color4f(MEASUREMENT_COLOR.r, MEASUREMENT_COLOR.g, MEASUREMENT_COLOR.b, 1)
  )
  const bgRect = r.ck.RRectXY(
    r.ck.XYWHRect(px, py, pw, ph),
    MEASUREMENT_PILL_RADIUS,
    MEASUREMENT_PILL_RADIUS
  )
  canvas.drawRRect(bgRect, r.auxFill)

  // White text
  r.auxFill.setColor(r.ck.Color4f(1, 1, 1, 1))
  canvas.drawText(text, cx - textWidth / 2, cy + MEASUREMENT_FONT_SIZE * 0.35, r.auxFill, font)
}

export function drawMeasurements(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: Set<string>,
  hoveredNodeId?: string | null
): void {
  if (!hoveredNodeId || selectedIds.size !== 1) return
  const selId = [...selectedIds][0]
  if (selId === hoveredNodeId) return
  // Don't measure if hovered is selected
  if (selectedIds.has(hoveredNodeId)) return

  const selNode = graph.getNode(selId)
  const hovNode = graph.getNode(hoveredNodeId)
  if (!selNode || !hovNode) return

  const a = nodeBounds(graph, selId, selNode)
  const b = nodeBounds(graph, hoveredNodeId, hovNode)

  // Set up measurement paint
  const mPaint = r.auxStroke
  mPaint.setColor(
    r.ck.Color4f(MEASUREMENT_COLOR.r, MEASUREMENT_COLOR.g, MEASUREMENT_COLOR.b, 1)
  )
  mPaint.setStrokeWidth(MEASUREMENT_LINE_WIDTH)
  mPaint.setPathEffect(
    r.ck.PathEffect.MakeDash(MEASUREMENT_DASH, 0)
  )

  // Convert to screen coords
  const sa = {
    x1: a.x1 * r.zoom + r.panX,
    y1: a.y1 * r.zoom + r.panY,
    x2: a.x2 * r.zoom + r.panX,
    y2: a.y2 * r.zoom + r.panY,
  }
  const sb = {
    x1: b.x1 * r.zoom + r.panX,
    y1: b.y1 * r.zoom + r.panY,
    x2: b.x2 * r.zoom + r.panX,
    y2: b.y2 * r.zoom + r.panY,
  }

  // Compute horizontal gap (left/right)
  const hGaps: Array<{ dist: number; fromX: number; toX: number; label: string }> = []

  // A is left of B
  if (a.x2 <= b.x1) {
    hGaps.push({ dist: b.x1 - a.x2, fromX: sa.x2, toX: sb.x1, label: `${Math.round(b.x1 - a.x2)}` })
  }
  // A is right of B
  if (a.x1 >= b.x2) {
    hGaps.push({ dist: a.x1 - b.x2, fromX: sb.x2, toX: sa.x1, label: `${Math.round(a.x1 - b.x2)}` })
  }
  // A contains B or overlaps — show edge distances
  if (a.x1 < b.x1 && a.x2 > b.x2) {
    const leftDist = b.x1 - a.x1
    const rightDist = a.x2 - b.x2
    if (leftDist > 0) hGaps.push({ dist: leftDist, fromX: sa.x1, toX: sb.x1, label: `${Math.round(leftDist)}` })
    if (rightDist > 0) hGaps.push({ dist: rightDist, fromX: sb.x2, toX: sa.x2, label: `${Math.round(rightDist)}` })
  }
  // B contains A
  if (b.x1 < a.x1 && b.x2 > a.x2) {
    const leftDist = a.x1 - b.x1
    const rightDist = b.x2 - a.x2
    if (leftDist > 0) hGaps.push({ dist: leftDist, fromX: sb.x1, toX: sa.x1, label: `${Math.round(leftDist)}` })
    if (rightDist > 0) hGaps.push({ dist: rightDist, fromX: sa.x2, toX: sb.x2, label: `${Math.round(rightDist)}` })
  }

  // Compute vertical gap (top/bottom)
  const vGaps: Array<{ dist: number; fromY: number; toY: number; label: string }> = []

  // A is above B
  if (a.y2 <= b.y1) {
    vGaps.push({ dist: b.y1 - a.y2, fromY: sa.y2, toY: sb.y1, label: `${Math.round(b.y1 - a.y2)}` })
  }
  // A is below B
  if (a.y1 >= b.y2) {
    vGaps.push({ dist: a.y1 - b.y2, fromY: sb.y2, toY: sa.y1, label: `${Math.round(a.y1 - b.y2)}` })
  }
  // A contains B vertically
  if (a.y1 < b.y1 && a.y2 > b.y2) {
    const topDist = b.y1 - a.y1
    const bottomDist = a.y2 - b.y2
    if (topDist > 0) vGaps.push({ dist: topDist, fromY: sa.y1, toY: sb.y1, label: `${Math.round(topDist)}` })
    if (bottomDist > 0) vGaps.push({ dist: bottomDist, fromY: sb.y2, toY: sa.y2, label: `${Math.round(bottomDist)}` })
  }
  // B contains A vertically
  if (b.y1 < a.y1 && b.y2 > a.y2) {
    const topDist = a.y1 - b.y1
    const bottomDist = b.y2 - a.y2
    if (topDist > 0) vGaps.push({ dist: topDist, fromY: sb.y1, toY: sa.y1, label: `${Math.round(topDist)}` })
    if (bottomDist > 0) vGaps.push({ dist: bottomDist, fromY: sa.y2, toY: sb.y2, label: `${Math.round(bottomDist)}` })
  }

  // Draw horizontal measurements
  for (const gap of hGaps) {
    if (gap.dist < 1) continue
    // Y midpoint: use overlap region or average of centers
    const overlapTop = Math.max(sa.y1, sb.y1)
    const overlapBot = Math.min(sa.y2, sb.y2)
    const lineY = overlapTop < overlapBot
      ? (overlapTop + overlapBot) / 2
      : ((sa.y1 + sa.y2) / 2 + (sb.y1 + sb.y2) / 2) / 2

    drawMeasurementLine(r, canvas, gap.fromX, lineY, gap.toX, lineY, mPaint)
    drawMeasurementPill(r, canvas, (gap.fromX + gap.toX) / 2, lineY - MEASUREMENT_PILL_HEIGHT, gap.label)
  }

  // Draw vertical measurements
  for (const gap of vGaps) {
    if (gap.dist < 1) continue
    // X midpoint: use overlap region or average of centers
    const overlapLeft = Math.max(sa.x1, sb.x1)
    const overlapRight = Math.min(sa.x2, sb.x2)
    const lineX = overlapLeft < overlapRight
      ? (overlapLeft + overlapRight) / 2
      : ((sa.x1 + sa.x2) / 2 + (sb.x1 + sb.x2) / 2) / 2

    drawMeasurementLine(r, canvas, lineX, gap.fromY, lineX, gap.toY, mPaint)
    drawMeasurementPill(r, canvas, lineX + MEASUREMENT_PILL_HEIGHT + 4, (gap.fromY + gap.toY) / 2, gap.label)
  }

  // Also draw a dashed outline around the hovered node
  mPaint.setStrokeWidth(1)
  canvas.drawRect(r.ck.LTRBRect(sb.x1, sb.y1, sb.x2, sb.y2), mPaint)

  // Reset path effect
  mPaint.setPathEffect(null)
}

// ── Padding visualization ────────────────────────────────────

const PADDING_COLOR = { r: 0.3, g: 0.8, b: 0.4, a: 0.15 }
const GAP_COLOR = { r: 0.9, g: 0.5, b: 0.2, a: 0.15 }

export function drawPaddingOverlay(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: Set<string>
): void {
  if (selectedIds.size !== 1) return
  const nodeId = [...selectedIds][0]
  const node = graph.getNode(nodeId)
  if (!node) return

  const { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl } = node
  if (pt === 0 && pr === 0 && pb === 0 && pl === 0) return

  const bounds = nodeBounds(graph, nodeId, node)
  const sx1 = bounds.x1 * r.zoom + r.panX
  const sy1 = bounds.y1 * r.zoom + r.panY
  const sx2 = bounds.x2 * r.zoom + r.panX
  const sy2 = bounds.y2 * r.zoom + r.panY

  const fill = r.auxFill
  fill.setColor(r.ck.Color4f(PADDING_COLOR.r, PADDING_COLOR.g, PADDING_COLOR.b, PADDING_COLOR.a))

  const ptS = pt * r.zoom
  const prS = pr * r.zoom
  const pbS = pb * r.zoom
  const plS = pl * r.zoom

  // Top padding
  if (pt > 0) canvas.drawRect(r.ck.LTRBRect(sx1, sy1, sx2, sy1 + ptS), fill)
  // Bottom padding
  if (pb > 0) canvas.drawRect(r.ck.LTRBRect(sx1, sy2 - pbS, sx2, sy2), fill)
  // Left padding (between top and bottom)
  if (pl > 0) canvas.drawRect(r.ck.LTRBRect(sx1, sy1 + ptS, sx1 + plS, sy2 - pbS), fill)
  // Right padding (between top and bottom)
  if (pr > 0) canvas.drawRect(r.ck.LTRBRect(sx2 - prS, sy1 + ptS, sx2, sy2 - pbS), fill)

  // Draw padding labels
  if (pt > 0) drawMeasurementPill(r, canvas, (sx1 + sx2) / 2, sy1 + ptS / 2 - MEASUREMENT_PILL_HEIGHT / 2, `${Math.round(pt)}`)
  if (pb > 0) drawMeasurementPill(r, canvas, (sx1 + sx2) / 2, sy2 - pbS / 2 - MEASUREMENT_PILL_HEIGHT / 2, `${Math.round(pb)}`)
  if (pl > 0) drawMeasurementPill(r, canvas, sx1 + plS / 2, (sy1 + ptS + sy2 - pbS) / 2 - MEASUREMENT_PILL_HEIGHT / 2, `${Math.round(pl)}`)
  if (pr > 0) drawMeasurementPill(r, canvas, sx2 - prS / 2, (sy1 + ptS + sy2 - pbS) / 2 - MEASUREMENT_PILL_HEIGHT / 2, `${Math.round(pr)}`)

  // Gap visualization for auto-layout
  if (node.layoutMode !== 'NONE' && node.itemSpacing > 0) {
    const children = graph.getChildren(nodeId).filter((c) => c.visible)
    if (children.length < 2) return

    fill.setColor(r.ck.Color4f(GAP_COLOR.r, GAP_COLOR.g, GAP_COLOR.b, GAP_COLOR.a))
    const isHorizontal = node.layoutMode === 'HORIZONTAL'

    for (let i = 0; i < children.length - 1; i++) {
      const cb = nodeBounds(graph, children[i].id, children[i])
      const nb = nodeBounds(graph, children[i + 1].id, children[i + 1])

      if (isHorizontal) {
        const gx1 = cb.x2 * r.zoom + r.panX
        const gx2 = nb.x1 * r.zoom + r.panX
        const gy1 = Math.max(cb.y1, nb.y1) * r.zoom + r.panY
        const gy2 = Math.min(cb.y2, nb.y2) * r.zoom + r.panY
        if (gx2 > gx1 && gy2 > gy1) {
          canvas.drawRect(r.ck.LTRBRect(gx1, gy1, gx2, gy2), fill)
          drawMeasurementPill(r, canvas, (gx1 + gx2) / 2, (gy1 + gy2) / 2 - MEASUREMENT_PILL_HEIGHT / 2, `${Math.round(node.itemSpacing)}`)
        }
      } else {
        const gy1 = cb.y2 * r.zoom + r.panY
        const gy2 = nb.y1 * r.zoom + r.panY
        const gx1 = Math.max(cb.x1, nb.x1) * r.zoom + r.panX
        const gx2 = Math.min(cb.x2, nb.x2) * r.zoom + r.panX
        if (gy2 > gy1 && gx2 > gx1) {
          canvas.drawRect(r.ck.LTRBRect(gx1, gy1, gx2, gy2), fill)
          drawMeasurementPill(r, canvas, (gx1 + gx2) / 2, (gy1 + gy2) / 2 - MEASUREMENT_PILL_HEIGHT / 2, `${Math.round(node.itemSpacing)}`)
        }
      }
    }
  }
}
