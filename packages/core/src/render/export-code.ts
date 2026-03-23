/**
 * Multi-format code export: Vue SFC, React Component, HTML+CSS.
 *
 * Converts selected SceneGraph nodes into production-ready code.
 */

import { colorToHex8, colorToCSSCompact } from '../color'

import type { Color } from '../types'
import type { SceneGraph, SceneNode, Fill, Stroke, Effect } from '../scene-graph'

export type CodeFormat = 'vue-sfc' | 'react' | 'html'

// ── CSS generation from SceneNode ────────────────────────────

function formatColor(color: Color, opacity = 1): string {
  return colorToHex8(color, opacity)
}

function solidFillColor(fills: Fill[]): string | null {
  const visible = fills.filter((f) => f.visible && f.type === 'SOLID')
  if (visible.length !== 1) return null
  return formatColor(visible[0].color, visible[0].opacity)
}

function solidStroke(strokes: Stroke[]): { color: string; weight: number } | null {
  const visible = strokes.filter((s) => s.visible)
  if (visible.length !== 1) return null
  return { color: formatColor(visible[0].color, visible[0].opacity), weight: visible[0].weight }
}

function formatShadowCSS(e: Effect): string | null {
  if (e.type !== 'DROP_SHADOW' && e.type !== 'INNER_SHADOW') return null
  const color = colorToCSSCompact(e.color)
  const inset = e.type === 'INNER_SHADOW' ? 'inset ' : ''
  const spread = e.spread !== 0 ? ` ${e.spread}px` : ''
  return `${inset}${e.offset.x}px ${e.offset.y}px ${e.radius}px${spread} ${color}`
}

interface CSSProps {
  [key: string]: string
}

function applyLayoutCSS(node: SceneNode, css: CSSProps): void {
  if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') {
    css['display'] = 'flex'
    if (node.layoutMode === 'VERTICAL') css['flex-direction'] = 'column'
    if (node.itemSpacing > 0) css['gap'] = `${node.itemSpacing}px`
    if (node.primaryAxisAlign === 'CENTER') css['justify-content'] = 'center'
    else if (node.primaryAxisAlign === 'MAX') css['justify-content'] = 'flex-end'
    else if (node.primaryAxisAlign === 'SPACE_BETWEEN') css['justify-content'] = 'space-between'
    if (node.counterAxisAlign === 'CENTER') css['align-items'] = 'center'
    else if (node.counterAxisAlign === 'MAX') css['align-items'] = 'flex-end'
    if (node.layoutWrap === 'WRAP') css['flex-wrap'] = 'wrap'
  } else if (node.layoutMode === 'GRID') {
    css['display'] = 'grid'
    if (node.gridTemplateColumns.length > 0) {
      css['grid-template-columns'] = node.gridTemplateColumns
        .map((t) => {
          if (t.sizing === 'FR') return `${t.value}fr`
          return t.sizing === 'FIXED' ? `${t.value}px` : 'auto'
        })
        .join(' ')
    }
    if (node.gridTemplateRows.length > 0) {
      css['grid-template-rows'] = node.gridTemplateRows
        .map((t) => {
          if (t.sizing === 'FR') return `${t.value}fr`
          return t.sizing === 'FIXED' ? `${t.value}px` : 'auto'
        })
        .join(' ')
    }
  }
}

function applyEffectsCSS(node: SceneNode, css: CSSProps): void {
  const shadows = node.effects
    .filter((e) => e.visible)
    .map(formatShadowCSS)
    .filter(Boolean)
  if (shadows.length > 0) css['box-shadow'] = shadows.join(', ')

  const blur = node.effects.find((e) => e.type === 'LAYER_BLUR' && e.visible)
  if (blur) css['filter'] = `blur(${blur.radius}px)`
  const bgBlur = node.effects.find((e) => e.type === 'BACKGROUND_BLUR' && e.visible)
  if (bgBlur) css['backdrop-filter'] = `blur(${bgBlur.radius}px)`
}

function applyTextCSS(node: SceneNode, css: CSSProps): void {
  if (node.type !== 'TEXT') return
  if (node.fontSize) css['font-size'] = `${node.fontSize}px`
  if (node.fontFamily) css['font-family'] = `'${node.fontFamily}', sans-serif`
  if (node.fontWeight && node.fontWeight !== 400) css['font-weight'] = String(node.fontWeight)
  if (node.lineHeight != null && node.lineHeight > 0) css['line-height'] = `${node.lineHeight}px`
  if (node.letterSpacing) css['letter-spacing'] = `${node.letterSpacing}px`
  if (node.textAlignHorizontal === 'CENTER') css['text-align'] = 'center'
  else if (node.textAlignHorizontal === 'RIGHT') css['text-align'] = 'right'
  else if (node.textAlignHorizontal === 'JUSTIFIED') css['text-align'] = 'justify'
}

function applyPaddingCSS(node: SceneNode, css: CSSProps): void {
  const { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl } = node
  if (pt > 0 || pr > 0 || pb > 0 || pl > 0) {
    if (pt === pr && pr === pb && pb === pl) css['padding'] = `${pt}px`
    else if (pt === pb && pl === pr) css['padding'] = `${pt}px ${pr}px`
    else css['padding'] = `${pt}px ${pr}px ${pb}px ${pl}px`
  }
}

function applyBoxCSS(node: SceneNode, css: CSSProps): void {
  const bg = solidFillColor(node.fills)
  if (bg) css[node.type === 'TEXT' ? 'color' : 'background'] = bg

  const stroke = solidStroke(node.strokes)
  if (stroke) css['border'] = `${stroke.weight}px solid ${stroke.color}`

  if (node.cornerRadius > 0) {
    if (node.independentCorners) {
      css['border-radius'] = `${node.topLeftRadius}px ${node.topRightRadius}px ${node.bottomRightRadius}px ${node.bottomLeftRadius}px`
    } else {
      css['border-radius'] = `${node.cornerRadius}px`
    }
  }

  if (node.opacity < 1) css['opacity'] = String(Number(node.opacity.toFixed(2)))
  if (node.clipsContent) css['overflow'] = 'hidden'
  if (node.rotation !== 0) css['transform'] = `rotate(${Number(node.rotation.toFixed(2))}deg)`
}

function nodeToCSS(node: SceneNode, graph: SceneGraph): CSSProps {
  const css: CSSProps = {}
  const parent = node.parentId ? graph.getNode(node.parentId) : null
  const parentIsAutoLayout = parent ? parent.layoutMode !== 'NONE' : false

  if (!parentIsAutoLayout) {
    css['position'] = 'absolute'
    css['left'] = `${node.x}px`
    css['top'] = `${node.y}px`
  }
  if (node.width > 0) css['width'] = `${node.width}px`
  if (node.height > 0) css['height'] = `${node.height}px`

  applyLayoutCSS(node, css)
  applyPaddingCSS(node, css)
  applyBoxCSS(node, css)
  applyEffectsCSS(node, css)
  applyTextCSS(node, css)

  if (parentIsAutoLayout && node.layoutGrow === 1) css['flex'] = '1'

  return css
}

// ── Shared helpers ───────────────────────────────────────────

function cssToString(css: CSSProps, indent: string): string {
  return Object.entries(css)
    .map(([k, v]) => `${indent}${k}: ${v};`)
    .join('\n')
}

function sanitizeClassName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function sanitizeComponentName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('')
    || 'Component'
}

function escapeHTML(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function htmlTag(node: SceneNode): string {
  if (node.type === 'TEXT') return 'p'
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE') return 'section'
  if (node.type === 'FRAME' || node.type === 'GROUP') return 'div'
  return 'div'
}

// ── Tree traversal ───────────────────────────────────────────

interface CodeNode {
  className: string
  tag: string
  css: CSSProps
  text: string | null
  children: CodeNode[]
}

function buildCodeTree(nodeId: string, graph: SceneGraph, classCounter: { n: number }): CodeNode | null {
  const node = graph.getNode(nodeId)
  if (!node || !node.visible) return null

  const baseName = sanitizeClassName(node.name || node.type)
  const className = `${baseName}-${classCounter.n++}`
  const css = nodeToCSS(node, graph)
  const tag = htmlTag(node)
  const text = node.type === 'TEXT' ? (node.text || '') : null

  const children: CodeNode[] = []
  if (node.type !== 'TEXT') {
    for (const childNode of graph.getChildren(node.id)) {
      const child = buildCodeTree(childNode.id, graph, classCounter)
      if (child) children.push(child)
    }
  }

  return { className, tag, css, text, children }
}

function collectAllCSS(codeNode: CodeNode, rules: string[]): void {
  if (Object.keys(codeNode.css).length > 0) {
    rules.push(`.${codeNode.className} {\n${cssToString(codeNode.css, '  ')}\n}`)
  }
  for (const child of codeNode.children) {
    collectAllCSS(child, rules)
  }
}

// ── HTML rendering ───────────────────────────────────────────

function renderHTML(codeNode: CodeNode, indent: number): string {
  const pad = '  '.repeat(indent)
  const attrs = ` class="${codeNode.className}"`

  if (codeNode.text != null) {
    return `${pad}<${codeNode.tag}${attrs}>${escapeHTML(codeNode.text)}</${codeNode.tag}>`
  }

  if (codeNode.children.length === 0) {
    return `${pad}<${codeNode.tag}${attrs} />`
  }

  const childrenHTML = codeNode.children.map((c) => renderHTML(c, indent + 1)).join('\n')
  return `${pad}<${codeNode.tag}${attrs}>\n${childrenHTML}\n${pad}</${codeNode.tag}>`
}

// ── Format generators ────────────────────────────────────────

function generateHTML(tree: CodeNode, componentName: string): string {
  const cssRules: string[] = []
  collectAllCSS(tree, cssRules)
  const html = renderHTML(tree, 1)
  const css = cssRules.join('\n\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${componentName}</title>
  <style>
${css.split('\n').map((l) => '    ' + l).join('\n')}
  </style>
</head>
<body>
${html}
</body>
</html>`
}

function generateVueSFC(tree: CodeNode, componentName: string): string {
  const cssRules: string[] = []
  collectAllCSS(tree, cssRules)
  const html = renderHTML(tree, 2)
  const css = cssRules.join('\n\n')

  return `<script setup lang="ts">
// ${componentName} — generated from design
</script>

<template>
  <div class="${tree.className}">
${html}
  </div>
</template>

<style scoped>
${css}
</style>`
}

function renderJSX(codeNode: CodeNode, indent: number): string {
  const pad = '  '.repeat(indent)
  const attrs = ` className="${codeNode.className}"`

  if (codeNode.text != null) {
    return `${pad}<${codeNode.tag}${attrs}>${escapeHTML(codeNode.text)}</${codeNode.tag}>`
  }

  if (codeNode.children.length === 0) {
    return `${pad}<${codeNode.tag}${attrs} />`
  }

  const childrenJSX = codeNode.children.map((c) => renderJSX(c, indent + 1)).join('\n')
  return `${pad}<${codeNode.tag}${attrs}>\n${childrenJSX}\n${pad}</${codeNode.tag}>`
}

function generateReact(tree: CodeNode, componentName: string): string {
  const cssRules: string[] = []
  collectAllCSS(tree, cssRules)
  const jsx = renderJSX(tree, 2)
  const css = cssRules.join('\n\n')
  const name = sanitizeComponentName(componentName)

  return `import './styles.css'

export function ${name}() {
  return (
${jsx}
  )
}

/* styles.css */
/*
${css}
*/`
}

// ── Public API ───────────────────────────────────────────────

export function selectionToCode(
  nodeIds: string[],
  graph: SceneGraph,
  format: CodeFormat = 'html'
): string {
  if (nodeIds.length === 0) return ''

  const counter = { n: 0 }
  const trees = nodeIds
    .map((id) => buildCodeTree(id, graph, counter))
    .filter((t): t is CodeNode => t !== null)

  if (trees.length === 0) return ''

  const firstNode = graph.getNode(nodeIds[0])
  const componentName = firstNode?.name || 'Component'

  // If multiple nodes, wrap in a container
  const root: CodeNode = trees.length === 1
    ? trees[0]
    : {
        className: 'container-0',
        tag: 'div',
        css: { display: 'flex', gap: '0px' },
        text: null,
        children: trees
      }

  switch (format) {
    case 'vue-sfc': return generateVueSFC(root, componentName)
    case 'react': return generateReact(root, componentName)
    default: return generateHTML(root, componentName)
  }
}
