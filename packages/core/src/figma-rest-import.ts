import type {
  SceneNode,
  NodeType,
  Fill,
  FillType,
  Stroke,
  Effect,
  BlendMode,
  ImageScaleMode,
  StrokeCap,
  StrokeJoin,
  LayoutMode,
  LayoutSizing,
  LayoutAlign,
  LayoutCounterAlign,
  LayoutAlignSelf,
  LayoutWrap,
  ConstraintType,
  TextAutoResize,
  TextAlignVertical,
  TextCase,
  TextDecoration,
  ArcData,
  StyleRun,
  CharacterStyleOverride,
} from './scene-graph'
import { SceneGraph } from './scene-graph'
import type { Color } from './types'

// --- Figma REST API types (subset needed for conversion) ---

export interface FigmaFileResponse {
  name: string
  document: FigmaNode
  components: Record<string, unknown>
  schemaVersion: number
}

export interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number }
  fills?: FigmaFill[]
  strokes?: FigmaFill[]
  strokeWeight?: number
  strokeAlign?: string
  strokeCap?: string
  strokeJoin?: string
  strokeDashes?: number[]
  effects?: FigmaEffect[]
  opacity?: number
  visible?: boolean
  locked?: boolean
  clipsContent?: boolean
  blendMode?: string
  cornerRadius?: number
  rectangleCornerRadii?: [number, number, number, number]
  cornerSmoothing?: number
  rotation?: number
  characters?: string
  style?: FigmaTextStyle
  characterStyleOverrides?: number[]
  styleOverrideTable?: Record<string, FigmaTextStyle>
  layoutMode?: string
  layoutWrap?: string
  primaryAxisAlignItems?: string
  counterAxisAlignItems?: string
  primaryAxisSizingMode?: string
  counterAxisSizingMode?: string
  itemSpacing?: number
  counterAxisSpacing?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  layoutPositioning?: string
  layoutGrow?: number
  layoutAlign?: string
  constraints?: { horizontal: string; vertical: string }
  isMask?: boolean
  arcData?: { startingAngle: number; endingAngle: number; innerRadius: number }
  componentId?: string
}

interface FigmaTextStyle {
  fontFamily?: string
  fontWeight?: number
  fontSize?: number
  italic?: boolean
  textAlignHorizontal?: string
  textAlignVertical?: string
  textAutoResize?: string
  textCase?: string
  textDecoration?: string
  lineHeightPx?: number
  letterSpacing?: number
}

interface FigmaFill {
  type: string
  color?: { r: number; g: number; b: number; a: number }
  opacity?: number
  visible?: boolean
  blendMode?: string
  gradientStops?: { color: { r: number; g: number; b: number; a: number }; position: number }[]
  imageRef?: string
  scaleMode?: string
}

interface FigmaEffect {
  type: string
  color?: { r: number; g: number; b: number; a: number }
  offset?: { x: number; y: number }
  radius?: number
  spread?: number
  visible?: boolean
  blendMode?: string
}

// --- Color ---

function convertColor(c?: { r: number; g: number; b: number; a: number }): Color {
  if (!c) return { r: 0, g: 0, b: 0, a: 1 }
  return { r: c.r, g: c.g, b: c.b, a: c.a ?? 1 }
}

// --- Node type mapping ---

const NODE_TYPE_MAP: Record<string, NodeType> = {
  CANVAS: 'CANVAS',
  FRAME: 'FRAME',
  RECTANGLE: 'RECTANGLE',
  ROUNDED_RECTANGLE: 'RECTANGLE',
  ELLIPSE: 'ELLIPSE',
  TEXT: 'TEXT',
  LINE: 'LINE',
  STAR: 'STAR',
  REGULAR_POLYGON: 'POLYGON',
  VECTOR: 'VECTOR',
  BOOLEAN_OPERATION: 'VECTOR',
  GROUP: 'GROUP',
  SECTION: 'SECTION',
  COMPONENT: 'COMPONENT',
  COMPONENT_SET: 'COMPONENT_SET',
  INSTANCE: 'INSTANCE',
  CONNECTOR: 'CONNECTOR',
  SHAPE_WITH_TEXT: 'SHAPE_WITH_TEXT',
}
function mapNodeType(type: string): NodeType {
  return NODE_TYPE_MAP[type] ?? 'RECTANGLE'
}

// --- Fills ---

function convertFills(fills?: FigmaFill[]): Fill[] {
  if (!fills) return []
  return fills.map((f) => {
    const base: Fill = {
      type: (f.type ?? 'SOLID') as FillType,
      color: convertColor(f.color),
      opacity: f.opacity ?? 1,
      visible: f.visible ?? true,
      blendMode: (f.blendMode ?? 'NORMAL') as BlendMode,
    }
    if (f.type?.startsWith('GRADIENT') && f.gradientStops) {
      base.gradientStops = f.gradientStops.map((s) => ({
        color: convertColor(s.color),
        position: s.position,
      }))
    }
    if (f.type === 'IMAGE' && f.imageRef) {
      base.imageHash = f.imageRef
      base.imageScaleMode = (f.scaleMode ?? 'FILL') as ImageScaleMode
    }
    return base
  })
}

// --- Strokes ---

function convertStrokes(
  fills?: FigmaFill[],
  weight?: number,
  align?: string,
  cap?: string,
  join?: string,
  dashes?: number[]
): Stroke[] {
  if (!fills) return []
  return fills.map((f) => ({
    color: convertColor(f.color),
    weight: weight ?? 1,
    opacity: f.opacity ?? 1,
    visible: f.visible ?? true,
    align: align === 'INSIDE' ? 'INSIDE' : align === 'OUTSIDE' ? 'OUTSIDE' : 'CENTER',
    cap: (cap ?? 'NONE') as StrokeCap,
    join: (join ?? 'MITER') as StrokeJoin,
    dashPattern: dashes ?? [],
  }))
}

// --- Effects ---

function convertEffects(effects?: FigmaEffect[]): Effect[] {
  if (!effects) return []
  return effects
    .filter((e) => ['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR'].includes(e.type))
    .map((e) => ({
      type: e.type as Effect['type'],
      color: convertColor(e.color),
      offset: e.offset ?? { x: 0, y: 0 },
      radius: e.radius ?? 0,
      spread: e.spread ?? 0,
      visible: e.visible ?? true,
      blendMode: (e.blendMode ?? 'NORMAL') as BlendMode,
    }))
}

// --- Layout helpers ---
function mapLayoutMode(mode?: string): LayoutMode {
  if (mode === 'HORIZONTAL') return 'HORIZONTAL'
  if (mode === 'VERTICAL') return 'VERTICAL'
  return 'NONE'
}

function mapLayoutSizing(mode?: string): LayoutSizing {
  if (mode === 'HUG') return 'HUG'
  if (mode === 'FILL') return 'FILL'
  return 'FIXED'
}

function mapLayoutAlign(align?: string): LayoutAlign {
  if (align === 'CENTER') return 'CENTER'
  if (align === 'MAX') return 'MAX'
  if (align === 'SPACE_BETWEEN') return 'SPACE_BETWEEN'
  return 'MIN'
}

function mapCounterAlign(align?: string): LayoutCounterAlign {
  if (align === 'CENTER') return 'CENTER'
  if (align === 'MAX') return 'MAX'
  if (align === 'STRETCH') return 'STRETCH'
  if (align === 'BASELINE') return 'BASELINE'
  return 'MIN'
}

function mapConstraint(c?: string): ConstraintType {
  if (c === 'CENTER') return 'CENTER'
  if (c === 'MAX') return 'MAX'
  if (c === 'STRETCH') return 'STRETCH'
  if (c === 'SCALE') return 'SCALE'
  return 'MIN'
}

// --- Text style runs ---

function buildStyleRuns(node: FigmaNode): StyleRun[] {
  const overrides = node.characterStyleOverrides
  const table = node.styleOverrideTable
  if (!overrides?.length || !table) return []

  const runs: StyleRun[] = []
  let currentId = overrides[0]
  let start = 0

  for (let i = 1; i <= overrides.length; i++) {
    if (i === overrides.length || overrides[i] !== currentId) {
      if (currentId !== 0) {
        const raw = table[String(currentId)] as FigmaTextStyle | undefined
        if (raw) {
          const style: CharacterStyleOverride = {}
          if (raw.fontFamily) style.fontFamily = raw.fontFamily
          if (raw.fontWeight != null) style.fontWeight = raw.fontWeight
          if (raw.italic != null) style.italic = raw.italic
          if (raw.fontSize != null) style.fontSize = raw.fontSize
          if (raw.letterSpacing != null) style.letterSpacing = raw.letterSpacing
          if (raw.lineHeightPx != null) style.lineHeight = raw.lineHeightPx
          if (raw.textDecoration) style.textDecoration = raw.textDecoration as TextDecoration
          if (Object.keys(style).length > 0) {
            runs.push({ start, length: i - start, style })
          }
        }
      }
      if (i < overrides.length) {
        currentId = overrides[i]
        start = i
      }
    }
  }
  return runs
}

// --- Main converter ---

function convertNode(node: FigmaNode): Partial<SceneNode> {
  const type = mapNodeType(node.type)
  const bb = node.absoluteBoundingBox
  const style = node.style

  const props: Partial<SceneNode> = {
    type,
    name: node.name || type,
    x: bb?.x ?? 0,
    y: bb?.y ?? 0,
    width: bb?.width ?? 0,
    height: bb?.height ?? 0,
    rotation: node.rotation ?? 0,
    visible: node.visible ?? true,
    locked: node.locked ?? false,
    opacity: node.opacity ?? 1,
    clipsContent: node.clipsContent ?? false,
    blendMode: (node.blendMode ?? 'PASS_THROUGH') as BlendMode,
    fills: convertFills(node.fills),
    strokes: convertStrokes(node.strokes, node.strokeWeight, node.strokeAlign, node.strokeCap, node.strokeJoin, node.strokeDashes),
    effects: convertEffects(node.effects),
  }

  // Corner radii
  if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii
    props.topLeftRadius = tl
    props.topRightRadius = tr
    props.bottomRightRadius = br
    props.bottomLeftRadius = bl
    props.independentCorners = true
    props.cornerRadius = tl
  } else if (node.cornerRadius != null) {
    props.cornerRadius = node.cornerRadius
    props.topLeftRadius = node.cornerRadius
    props.topRightRadius = node.cornerRadius
    props.bottomRightRadius = node.cornerRadius
    props.bottomLeftRadius = node.cornerRadius
  }
  if (node.cornerSmoothing != null) props.cornerSmoothing = node.cornerSmoothing

  // Constraints
  if (node.constraints) {
    props.horizontalConstraint = mapConstraint(node.constraints.horizontal)
    props.verticalConstraint = mapConstraint(node.constraints.vertical)
  }

  // Auto-layout
  if (node.layoutMode) {
    props.layoutMode = mapLayoutMode(node.layoutMode)
    props.layoutWrap = (node.layoutWrap ?? 'NO_WRAP') as LayoutWrap
    props.primaryAxisAlign = mapLayoutAlign(node.primaryAxisAlignItems)
    props.counterAxisAlign = mapCounterAlign(node.counterAxisAlignItems)
    props.primaryAxisSizing = mapLayoutSizing(node.primaryAxisSizingMode)
    props.counterAxisSizing = mapLayoutSizing(node.counterAxisSizingMode)
    props.itemSpacing = node.itemSpacing ?? 0
    props.counterAxisSpacing = node.counterAxisSpacing ?? 0
    props.paddingTop = node.paddingTop ?? 0
    props.paddingRight = node.paddingRight ?? 0
    props.paddingBottom = node.paddingBottom ?? 0
    props.paddingLeft = node.paddingLeft ?? 0
  }

  // Layout child props
  if (node.layoutPositioning) props.layoutPositioning = node.layoutPositioning as 'AUTO' | 'ABSOLUTE'
  if (node.layoutGrow != null) props.layoutGrow = node.layoutGrow
  if (node.layoutAlign) props.layoutAlignSelf = node.layoutAlign as LayoutAlignSelf

  // Text
  if (type === 'TEXT' && node.characters != null) {
    props.text = node.characters
    if (style) {
      props.fontFamily = style.fontFamily ?? 'Inter'
      props.fontWeight = style.fontWeight ?? 400
      props.fontSize = style.fontSize ?? 14
      props.italic = style.italic ?? false
      props.textAlignHorizontal = (style.textAlignHorizontal ?? 'LEFT') as SceneNode['textAlignHorizontal']
      props.textAlignVertical = (style.textAlignVertical ?? 'TOP') as TextAlignVertical
      props.textAutoResize = (style.textAutoResize ?? 'NONE') as TextAutoResize
      props.textCase = (style.textCase ?? 'ORIGINAL') as TextCase
      props.textDecoration = (style.textDecoration ?? 'NONE') as TextDecoration
      if (style.lineHeightPx != null) props.lineHeight = style.lineHeightPx
      if (style.letterSpacing != null) props.letterSpacing = style.letterSpacing
    }
    props.styleRuns = buildStyleRuns(node)
  }

  // Mask
  if (node.isMask) props.isMask = true

  // Arc data (ellipses)
  if (node.arcData) {
    props.arcData = {
      startingAngle: node.arcData.startingAngle,
      endingAngle: node.arcData.endingAngle,
      innerRadius: node.arcData.innerRadius,
    }
  }

  // Component instance
  if (node.componentId) props.componentId = node.componentId

  return props
}

// --- Public API ---

export function figmaFileToSceneGraph(file: FigmaFileResponse): SceneGraph {
  const graph = new SceneGraph()
  // Remove default page
  const defaultPages = graph.getPages()
  for (const p of defaultPages) graph.deleteNode(p.id)

  const doc = file.document
  if (!doc.children) return graph

  for (const pageNode of doc.children) {
    if (pageNode.type !== 'CANVAS') continue
    const page = graph.createNode('CANVAS', graph.rootId, {
      name: pageNode.name || 'Page',
      width: 0,
      height: 0,
    })
    if (pageNode.children) {
      for (const child of pageNode.children) {
        addNodeRecursive(graph, child, page.id)
      }
    }
  }

  return graph
}

function addNodeRecursive(graph: SceneGraph, node: FigmaNode, parentId: string): void {
  const props = convertNode(node)
  const type = props.type ?? 'RECTANGLE'
  // Pages are handled at top level
  if (type === 'CANVAS') return

  const created = graph.createNode(type, parentId, props)

  if (node.children) {
    for (const child of node.children) {
      addNodeRecursive(graph, child, created.id)
    }
  }
}
