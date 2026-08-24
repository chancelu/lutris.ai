import { colorDistance, colorToHex } from '../color'

import { defineTool } from './schema'

import type { Color } from '../types'
import type { SceneGraph, SceneNode } from '../scene-graph'

const NAME_ROLE_PATTERNS: { pattern: RegExp; role: string }[] = [
  { pattern: /^button$/i, role: 'button' },
  { pattern: /^btn[-_\s]/i, role: 'button' },
  { pattern: /[-_\s]btn$/i, role: 'button' },
  { pattern: /^cta$/i, role: 'button' },
  { pattern: /^icon[-_]?button$/i, role: 'button' },
  { pattern: /^link$/i, role: 'link' },
  { pattern: /^text[-_]?link$/i, role: 'link' },
  { pattern: /^input$/i, role: 'textbox' },
  { pattern: /^text[-_]?field$/i, role: 'textbox' },
  { pattern: /^search$/i, role: 'searchbox' },
  { pattern: /^checkbox$/i, role: 'checkbox' },
  { pattern: /^toggle$/i, role: 'switch' },
  { pattern: /^switch$/i, role: 'switch' },
  { pattern: /^radio$/i, role: 'radio' },
  { pattern: /^select$/i, role: 'combobox' },
  { pattern: /^dropdown$/i, role: 'combobox' },
  { pattern: /^slider$/i, role: 'slider' },
  { pattern: /^tab$/i, role: 'tab' },
  { pattern: /^tabs$/i, role: 'tablist' },
  { pattern: /^nav(bar|igation)?$/i, role: 'navigation' },
  { pattern: /^header$/i, role: 'banner' },
  { pattern: /^footer$/i, role: 'contentinfo' },
  { pattern: /^sidebar$/i, role: 'complementary' },
  { pattern: /^modal$/i, role: 'dialog' },
  { pattern: /^dialog$/i, role: 'dialog' },
  { pattern: /^tooltip$/i, role: 'tooltip' },
  { pattern: /^card$/i, role: 'article' },
  { pattern: /^avatar$/i, role: 'img' },
  { pattern: /^badge$/i, role: 'status' },
  { pattern: /^toast$/i, role: 'alert' },
  { pattern: /^alert$/i, role: 'alert' },
  { pattern: /^list$/i, role: 'list' },
  { pattern: /^menu$/i, role: 'menu' },
  { pattern: /^breadcrumb/i, role: 'navigation' },
  { pattern: /^progress$/i, role: 'progressbar' },
  { pattern: /^spinner$/i, role: 'progressbar' },
  { pattern: /^divider$/i, role: 'separator' },
  { pattern: /^separator$/i, role: 'separator' },
]

function detectRoleFromName(name: string): string | null {
  const base = (name.split(/[/,=]/)[0] ?? name).trim()
  for (const { pattern, role } of NAME_ROLE_PATTERNS) {
    if (pattern.test(base)) return role
  }
  return null
}

function headingLevel(fontSize: number): number | null {
  if (fontSize >= 32) return 1
  if (fontSize >= 24) return 2
  if (fontSize >= 20) return 3
  if (fontSize >= 18) return 4
  return null
}

function looksLikeSeparator(node: SceneNode): boolean {
  if (node.width <= 2 && node.height > 10) return true
  if (node.height <= 2 && node.width > 10) return true
  const ratio = Math.max(node.width, node.height) / Math.max(1, Math.min(node.width, node.height))
  return ratio > 10 && Math.min(node.width, node.height) <= 4
}

const BUTTON_MAX_WIDTH = 200
const BUTTON_MAX_HEIGHT = 50
const BUTTON_MIN_HEIGHT = 28
const BUTTON_MIN_RADIUS = 2

function looksLikeButton(node: SceneNode): boolean {
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return false
  if (node.width > BUTTON_MAX_WIDTH || node.height > BUTTON_MAX_HEIGHT || node.height < BUTTON_MIN_HEIGHT) return false
  if (node.fills.length === 0 && node.strokes.length === 0) return false
  if (node.cornerRadius < BUTTON_MIN_RADIUS) return false
  return node.childIds.length > 0
}

function describeVisual(node: SceneNode): string {
  const parts: string[] = []
  const fill = node.fills.find((f) => f.type === 'SOLID' && f.visible)
  if (fill) parts.push(`${colorToHex(fill.color)} fill`)
  if (node.strokes.length > 0 && node.strokes[0]?.visible) parts.push('bordered')
  if (node.cornerRadius > 0) parts.push('rounded')
  if (node.clipsContent) parts.push('clipped')
  for (const e of node.effects) {
    if (!e.visible) continue
    if (e.type === 'DROP_SHADOW') parts.push('drop shadow')
    else if (e.type === 'INNER_SHADOW') parts.push('inner shadow')
    else if (e.type === 'LAYER_BLUR' || e.type === 'FOREGROUND_BLUR') parts.push('blurred')
    else parts.push('backdrop blur')
  }
  return parts.join(', ') || 'no visual styles'
}

function describeLayout(node: SceneNode): string | null {
  if (node.layoutMode === 'NONE') return null
  const dir = node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical'
  const parts = [dir]
  if (node.itemSpacing > 0) parts.push(`${node.itemSpacing}px gap`)
  const pad = [node.paddingTop, node.paddingRight, node.paddingBottom, node.paddingLeft]
  const allSame = pad.every((p) => p === pad[0])
  const first = pad[0]
  if (allSame && first > 0) parts.push(`${first}px padding`)
  else if (pad.some((p) => p > 0)) parts.push(`padding ${pad.join('/')}`)
  if (node.layoutWrap === 'WRAP') parts.push('wrap')
  return parts.join(', ')
}

const MIN_FILL_OPACITY = 0.15
const MIN_STROKE_OPACITY = 0.20
const LOW_CONTRAST_THRESHOLD = 15

interface DescribeIssue {
  message: string
  suggestion?: string
}

function findAncestorBackground(node: SceneNode, graph: SceneGraph): Color | null {
  let current = node.parentId ? graph.getNode(node.parentId) : null
  while (current) {
    const solidFill = current.fills.find((f) => f.visible && f.type === 'SOLID' && f.opacity > 0.5)
    if (solidFill) return solidFill.color
    current = current.parentId ? graph.getNode(current.parentId) : null
  }
  return null
}

function detectSizeIssues(node: SceneNode, isContainer: boolean, issues: DescribeIssue[]): void {
  if (isContainer && node.parentId) {
    const name = node.name.toLowerCase()
    const isCard = name.includes('card') || name.includes('item') || name.includes('tile')
    if (isCard && node.width > 440) {
      issues.push({ message: `Card too wide (${Math.round(node.width)}px)`, suggestion: 'Max 400px for cards, 440px absolute max' })
    }
    if (looksLikeButton(node) && node.width > 200) {
      issues.push({ message: `Button too wide (${Math.round(node.width)}px)`, suggestion: 'Buttons should hug content, max ~200px' })
    }
  }
  if (node.type === 'TEXT' && node.fontSize > 48) {
    issues.push({ message: `Text size ${node.fontSize}px is very large`, suggestion: 'Use 32-40px for display, 24px for headings' })
  }
  // Vertical-text trap: the model sets a small w on Text to "align" it, the string
  // wraps one char per line, and the heading reads as a vertical strip. This
  // renderer has no vertical-text feature, so tall-narrow multi-char text is
  // always a defect.
  if (node.type === 'TEXT' && node.text.trim().length >= 4) {
    const approxCharW = node.fontSize * 0.9
    const charsPerLine = Math.max(1, Math.floor(node.width / approxCharW))
    if (charsPerLine <= 3 && node.text.trim().length > charsPerLine * 2 && node.height > node.width) {
      issues.push({
        message: `Text squeezed into a ${Math.round(node.width)}px-wide column (~${charsPerLine} chars/line) — reads as vertical text`,
        suggestion: 'Remove the w prop (Text auto-sizes) or widen it so the string fits on 1-2 lines'
      })
    }
  }
}

function detectStructuralIssues(node: SceneNode, gridSize: number, issues: DescribeIssue[]): void {
  if (node.x % 1 !== 0 || node.y % 1 !== 0) {
    issues.push({
      message: `Subpixel position (${node.x}, ${node.y})`,
      suggestion: `(${Math.round(node.x)}, ${Math.round(node.y)})`
    })
  }
  const isContainer = node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  if (isContainer && node.fills.length === 0 && node.childIds.length === 0) {
    issues.push({ message: 'Empty frame with no fill', suggestion: 'Add content or a fill color — empty frames are invisible' })
  }
  if (looksLikeButton(node) && node.width < 44) {
    issues.push({ message: `Touch target too small (${node.width}×${node.height})`, suggestion: 'Min 44×44' })
  }
  if (node.itemSpacing > 0 && node.itemSpacing % gridSize !== 0) {
    const nearest = Math.round(node.itemSpacing / gridSize) * gridSize
    issues.push({ message: `Gap ${node.itemSpacing} not on ${gridSize}px grid`, suggestion: `${nearest}` })
  }
  detectSizeIssues(node, isContainer, issues)
}

function detectVisibilityIssues(node: SceneNode, graph: SceneGraph, issues: DescribeIssue[]): void {
  for (const fill of node.fills) {
    if (!fill.visible || fill.type !== 'SOLID') continue
    if (fill.opacity < MIN_FILL_OPACITY) {
      issues.push({
        message: `Near-invisible fill ${colorToHex(fill.color)} at ${Math.round(fill.opacity * 100)}% opacity`,
        suggestion: `Increase to at least ${Math.round(MIN_FILL_OPACITY * 100)}%`
      })
    }
  }
  for (const stroke of node.strokes) {
    if (!stroke.visible || stroke.opacity >= MIN_STROKE_OPACITY) continue
    issues.push({
      message: `Near-invisible stroke at ${Math.round(stroke.opacity * 100)}% opacity`,
      suggestion: `Increase to at least ${Math.round(MIN_STROKE_OPACITY * 100)}%`
    })
  }
  if (node.type !== 'TEXT' || !node.parentId) return
  const textFill = node.fills.find((f) => f.visible && f.type === 'SOLID')
  if (!textFill) return
  const parentBg = findAncestorBackground(node, graph)
  if (!parentBg) return
  const dist = colorDistance(textFill.color, parentBg)
  if (dist < LOW_CONTRAST_THRESHOLD) {
    issues.push({
      message: `Low contrast: text ${colorToHex(textFill.color)} on ${colorToHex(parentBg)} (distance ${Math.round(dist)})`,
      suggestion: 'Increase color difference between text and background'
    })
  }
}

export function detectIssues(node: SceneNode, gridSize: number, graph: SceneGraph): DescribeIssue[] {
  const issues: DescribeIssue[] = []
  detectStructuralIssues(node, gridSize, issues)
  detectVisibilityIssues(node, graph, issues)
  detectGeometryIssues(node, graph, issues)
  return issues
}

// --- Geometry: sibling overlap & out-of-bounds (元素覆盖/排版混乱的硬检测) ---

const DECORATIVE_NAME = /orb|glow|bg\b|background|backdrop|decoration|blur|gradient|光晕|背景|装饰/i

/** Decorative layers (glow orbs, tinted washes) intentionally sit under siblings. */
function isDecorative(n: SceneNode): boolean {
  if (DECORATIVE_NAME.test(n.name)) return true
  if (n.opacity < 0.9) return true
  // PASS_THROUGH is the default blend for every node — only explicit modes count.
  if (n.blendMode !== 'NORMAL' && n.blendMode !== 'PASS_THROUGH') return true
  return n.fills.some((f) => f.visible && f.type.startsWith('GRADIENT'))
}

function rectOverlapArea(a: SceneNode, b: SceneNode): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

function checkOverlapPair(a: SceneNode, b: SceneNode, issues: DescribeIssue[], reported: Set<string>): void {
  const overlap = rectOverlapArea(a, b)
  if (overlap === 0) return
  // Measure coverage of the LARGER node: a tiny badge mostly covering an
  // avatar is intentional layering, but two frames each losing a big share
  // of their area to a sibling is a layout accident.
  const maxArea = Math.max(a.width * a.height, b.width * b.height)
  const pct = maxArea > 0 ? overlap / maxArea : 0
  // Minor layering (badges, icon-on-avatar) and decorative underlays are intentional.
  if (pct < 0.12) return
  if (isDecorative(a) || isDecorative(b)) return
  const nearDup =
    Math.abs(a.x - b.x) <= 8 &&
    Math.abs(a.y - b.y) <= 8 &&
    Math.abs(a.width - b.width) <= 8 &&
    Math.abs(a.height - b.height) <= 8
  const key = nearDup ? `dup:${a.name}` : `${a.id}:${b.id}`
  if (reported.has(key)) return
  reported.add(key)
  if (nearDup) {
    issues.push({
      message: `Stacked duplicate frames: "${a.name}" rendered twice at the same position`,
      suggestion: 'Delete the older copy — re-rendering without deleting the old subtree stacks nodes'
    })
  } else {
    issues.push({
      message: `Sibling overlap: "${a.name}" covers "${b.name}" by ${Math.round(pct * 100)}%`,
      suggestion: 'Put stacked content in ONE frame (text inside its card), or use flex layout instead of absolute x/y'
    })
  }
}

function detectSiblingOverlaps(node: SceneNode, kids: SceneNode[], issues: DescribeIssue[]): void {
  // Only meaningful in absolute-layout containers; flex/grid children are
  // positioned by yoga and cannot drift onto each other.
  if (node.layoutMode !== 'NONE' || kids.length < 2 || kids.length > 60) return
  const reported = new Set<string>()
  for (let i = 0; i < kids.length; i++) {
    for (let j = i + 1; j < kids.length; j++) {
      checkOverlapPair(kids[i], kids[j], issues, reported)
    }
  }
}

function detectOutOfBounds(node: SceneNode, kids: SceneNode[], issues: DescribeIssue[]): void {
  // Right/bottom overflow means the content ran out of room (left/top negative
  // offsets are the intentional "sticking out" kind). Decorative underlays may
  // bleed; clipped parents hide overflow; the canvas itself has no bounds.
  if (node.type === 'CANVAS' || node.clipsContent) return
  for (const k of kids) {
    if (isDecorative(k)) continue
    const overX = k.x + k.width - node.width
    const overY = k.y + k.height - node.height
    if (overX > 4 || overY > 4) {
      issues.push({
        message: `"${k.name}" overflows "${node.name}" by ${Math.max(Math.round(overX), 0)}px right / ${Math.max(Math.round(overY), 0)}px bottom`,
        suggestion: 'Shrink the child, widen the parent, or let the parent hug/fill instead of a fixed size'
      })
    }
  }
}

function detectGeometryIssues(node: SceneNode, graph: SceneGraph, issues: DescribeIssue[]): void {
  const isCanvas = node.type === 'CANVAS'
  const isContainer =
    isCanvas ||
    node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'SECTION'
  if (!isContainer) return
  const kids = node.childIds
    .map((id) => graph.getNode(id))
    .filter((k): k is SceneNode => !!k && k.visible)
  if (kids.length === 0) return

  // Page-level hygiene: a loose Text directly on the canvas is almost always an
  // orphan fragment left behind by a partial delete — real content lives in frames.
  if (isCanvas) {
    for (const k of kids) {
      if (k.type === 'TEXT') {
        issues.push({
          message: `Loose text "${k.text.slice(0, 20)}" directly on the canvas (orphan fragment?)`,
          suggestion: 'Delete it, or move it inside the frame it belongs to'
        })
      }
    }
  }

  detectSiblingOverlaps(node, kids, issues)
  detectOutOfBounds(node, kids, issues)
}

function detectRole(node: SceneNode): string {
  const nameDetected = detectRoleFromName(node.name)
  if (nameDetected) return nameDetected
  if (node.type === 'TEXT') {
    const level = headingLevel(node.fontSize)
    return level ? `heading(${level})` : 'StaticText'
  }
  if (looksLikeSeparator(node)) return 'separator'
  if (looksLikeButton(node)) return 'button'
  return 'generic'
}

function describeChild(node: SceneNode): { role: string; name: string; summary: string; id: string } {
  const role = detectRole(node)
  let summary = ''
  if (node.type === 'TEXT') {
    const text = node.text.slice(0, 60)
    summary = `"${text}" ${node.fontSize}px ${node.fontFamily}`
    if (node.fontWeight >= 700) summary += ' bold'
    else if (node.fontWeight >= 500) summary += ' medium'
    const textColor = node.fills.find((f) => f.type === 'SOLID' && f.visible)
    if (textColor) summary += `, ${colorToHex(textColor.color)}`
  } else {
    summary = `${node.width}×${node.height}`
    const fill = node.fills.find((f) => f.type === 'SOLID' && f.visible)
    if (fill) summary += `, ${colorToHex(fill.color)}`
    if (node.cornerRadius > 0) summary += ', rounded'
  }
  return { role, name: node.name, summary, id: node.id }
}

export const describe = defineTool({
  name: 'describe',
  description:
    'Semantic description of a node: role, visual style, layout, children summary, and design issues.',
  params: {
    id: { type: 'string', description: 'Node ID', required: true },
    grid: { type: 'number', description: 'Grid size for alignment checks (default: 8)' }
  },
  execute: (figma, args) => {
    const gridSize = args.grid ?? 8
    const raw = figma.graph.getNode(args.id)
    if (!raw) return { error: `Node "${args.id}" not found` }

    const role = detectRole(raw)
    const visual = describeVisual(raw)
    const layout = describeLayout(raw)
    const issues = detectIssues(raw, gridSize, figma.graph)

    const children: { role: string; name: string; summary: string; id: string }[] = []
    for (const childId of raw.childIds) {
      const child = figma.graph.getNode(childId)
      if (!child || !child.visible) continue
      children.push(describeChild(child))
    }

    const result: Record<string, unknown> = {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      role,
      size: `${raw.width}×${raw.height}`,
      visual,
    }
    if (layout) result.layout = layout
    if (children.length > 0) result.children = children
    if (issues.length > 0) result.issues = issues

    return result
  }
})
