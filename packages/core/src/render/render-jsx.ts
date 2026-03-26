import { transform } from 'sucrase'

import * as React from './mini-react'
import { renderTree, type RenderResult } from './renderer'
import { resolveToTree, type TreeNode } from './tree'

import type { SceneGraph } from '../scene-graph'

/**
 * Build a component function from a JSX string using sucrase.
 * Works in both Node/Bun and the browser (no native bindings).
 */
export function buildComponent(jsxString: string): () => unknown {
  const code = `
    const h = React.createElement
    const Frame = 'frame', Text = 'text', Rectangle = 'rectangle', Ellipse = 'ellipse'
    const Line = 'line', Star = 'star', Polygon = 'polygon', Vector = 'vector'
    const Group = 'group', Section = 'section', View = 'frame', Rect = 'rectangle'
    return function Component() { return ${jsxString.trim()} }
  `

  const result = transform(code, {
    transforms: ['typescript', 'jsx'],
    jsxPragma: 'h',
    production: true
  })

  // Shadow dangerous globals to prevent sandbox escape via new Function()
  const shadowGlobals = [
    'fetch', 'XMLHttpRequest', 'document', 'window', 'localStorage',
    'sessionStorage', 'indexedDB', 'WebSocket', 'importScripts', 'eval'
  ]
  const shadowArgs = shadowGlobals.join(',')
  const shadowVals = shadowGlobals.map(() => 'undefined').join(',')
  const wrappedCode = `return (function(${shadowArgs}){${result.code}})(${shadowVals})`
  return new Function('React', wrappedCode)(React) as () => unknown
}

interface RenderJSXOptions {
  x?: number
  y?: number
  parentId?: string
}

/**
 * Render a JSX string into the scene graph.
 * Works in both Node/Bun and the browser.
 */
export function renderJSX(
  graph: SceneGraph,
  jsxString: string,
  options?: RenderJSXOptions
): RenderResult {
  const Component = buildComponent(jsxString)
  const element = React.createElement(Component, null)
  const tree = resolveToTree(element)

  if (!tree) {
    throw new Error('JSX must return a Figma element (Frame, Text, etc)')
  }

  return renderTree(graph, tree, options)
}

/**
 * Render a pre-built TreeNode into the scene graph.
 */
export function renderTreeNode(
  graph: SceneGraph,
  tree: TreeNode,
  options?: RenderJSXOptions
): RenderResult {
  return renderTree(graph, tree, options)
}
