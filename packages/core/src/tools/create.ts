import { parseColor } from '../color'

import { defineTool, nodeSummary } from './schema'

import type { FigmaNodeProxy } from '../figma-api'

export const createShape = defineTool({
  name: 'create_shape',
  mutates: true,
  description:
    'Create a shape on the canvas. Use FRAME for containers/cards, RECTANGLE for solid blocks, ELLIPSE for circles, TEXT for labels, SECTION for page sections.',
  params: {
    type: {
      type: 'string',
      description: 'Node type',
      required: true,
      enum: ['FRAME', 'RECTANGLE', 'ELLIPSE', 'TEXT', 'LINE', 'STAR', 'POLYGON', 'SECTION']
    },
    x: { type: 'number', description: 'X position', required: true },
    y: { type: 'number', description: 'Y position', required: true },
    width: { type: 'number', description: 'Width in pixels', required: true, min: 1 },
    height: { type: 'number', description: 'Height in pixels', required: true, min: 1 },
    name: { type: 'string', description: 'Node name shown in layers panel' },
    parent_id: { type: 'string', description: 'Parent node ID to nest inside' }
  },
  execute: (figma, args) => {
    const parentId = args.parent_id
    const parent = parentId ? figma.getNodeById(parentId) : null
    const createMap: Record<string, () => FigmaNodeProxy> = {
      FRAME: () => figma.createFrame(),
      RECTANGLE: () => figma.createRectangle(),
      ELLIPSE: () => figma.createEllipse(),
      TEXT: () => figma.createText(),
      LINE: () => figma.createLine(),
      STAR: () => figma.createStar(),
      POLYGON: () => figma.createPolygon(),
      SECTION: () => figma.createSection()
    }
    const node = createMap[args.type]()
    node.x = args.x
    node.y = args.y
    node.resize(args.width, args.height)
    if (args.name) node.name = args.name
    if (parent) parent.appendChild(node)
    return nodeSummary(node)
  }
})

export const render = defineTool({
  name: 'render',
  mutates: true,
  description:
    'Render JSX to design nodes. Primary creation tool — creates entire component trees in one call. Example: <Frame name="Card" w={320} h="hug" flex="col" gap={16} p={24} bg="#FFF" rounded={16}><Text size={18} weight="bold">Title</Text></Frame>',
  params: {
    jsx: { type: 'string', description: 'JSX string to render', required: true },
    x: { type: 'number', description: 'X position of the root node' },
    y: { type: 'number', description: 'Y position of the root node' },
    parent_id: { type: 'string', description: 'Parent node ID to render into' }
  },
  execute: async (figma, args) => {
    const { renderJSX } = await import('../render/render-jsx.js')
    // renderJSX throws on malformed JSX (sucrase parse errors, unknown elements,
    // bad expressions). Letting it bubble surfaces as a bare "An error occurred."
    // in chat — the model gets no actionable detail and gives up. Return the real
    // message instead so it can fix the JSX and retry.
    let result
    try {
      result = renderJSX(figma.graph, args.jsx, {
        parentId: args.parent_id ?? figma.currentPageId,
        x: args.x,
        y: args.y
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return {
        error:
          `Render failed: ${msg}. This is NOT a fatal error — fix the JSX ` +
          '(check tag names, prop syntax, unclosed elements, JS expressions) and call render again. ' +
          'For small targeted changes to existing nodes, prefer update_node / set_* tools over re-rendering.',
        failedJsx: typeof args.jsx === 'string' ? args.jsx.slice(0, 500) : ''
      }
    }

    // Layout first, then scan: renderJSX creates nodes with raw props, and yoga
    // layout normally runs AFTER the tool returns (wrapper / paint loop) — so a
    // quality scan here used to measure stale geometry (hug frames at 0×0, text
    // unmeasured). Compute real bounds before checking anything.
    const { computeAllLayouts } = await import('../layout.js')
    computeAllLayouts(figma.graph, figma.currentPageId)

    // Auto-quality scan: the new subtree, plus the parent level around it —
    // overlap with EXISTING siblings (stacked duplicates from re-rendering
    // without deleting) is the most common layout defect and is invisible
    // when scanning only the new subtree.
    const { detectIssues } = await import('./describe.js')
    const issues: { nodeId: string; nodeName: string; message: string; suggestion?: string }[] = []
    const seen = new Set<string>()
    function walkIssues(nodeId: string) {
      const node = figma.graph.getNode(nodeId)
      if (!node) return
      for (const issue of detectIssues(node, 8, figma.graph)) {
        const key = `${node.id}:${issue.message}`
        if (seen.has(key)) continue
        seen.add(key)
        issues.push({ nodeId: node.id, nodeName: node.name, ...issue })
      }
      for (const childId of node.childIds) walkIssues(childId)
    }
    walkIssues(result.id)
    const parentId = figma.graph.getNode(result.id)?.parentId
    if (parentId) walkIssues(parentId)

    // Ground-truth geometry so the model can verify placement without a
    // separate describe call: root bounds + one line per direct child.
    const root = figma.graph.getNode(result.id)
    const bounds = root
      ? {
          x: Math.round(root.x),
          y: Math.round(root.y),
          w: Math.round(root.width),
          h: Math.round(root.height),
          children: root.childIds.slice(0, 20).map((cid) => {
            const c = figma.graph.getNode(cid)
            return c
              ? `${c.name}(${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.width)}×${Math.round(c.height)})`
              : cid
          })
        }
      : undefined

    return {
      id: result.id, name: result.name, type: result.type,
      children: result.childIds,
      ...(bounds ? { bounds } : {}),
      ...(issues.length > 0 ? { quality_issues: issues, _note: 'Fix these issues before proceeding.' } : {})
    }
  }
})

export const createComponent = defineTool({
  name: 'create_component',
  mutates: true,
  description: 'Convert a frame/group into a component.',
  params: {
    id: { type: 'string', description: 'Node ID to convert', required: true }
  },
  execute: (figma, { id }) => {
    const node = figma.getNodeById(id)
    if (!node) return { error: `Node "${id}" not found` }
    const comp = figma.createComponentFromNode(node)
    return nodeSummary(comp)
  }
})

export const createInstance = defineTool({
  name: 'create_instance',
  mutates: true,
  description: 'Create an instance of a component.',
  params: {
    component_id: { type: 'string', description: 'Component node ID', required: true },
    x: { type: 'number', description: 'X position' },
    y: { type: 'number', description: 'Y position' }
  },
  execute: (figma, args) => {
    const comp = figma.getNodeById(args.component_id)
    if (!comp) return { error: `Component "${args.component_id}" not found` }
    const instance = comp.createInstance()
    if (args.x !== undefined) instance.x = args.x
    if (args.y !== undefined) instance.y = args.y
    return nodeSummary(instance)
  }
})

export const createPage = defineTool({
  name: 'create_page',
  mutates: true,
  description: 'Create a new page.',
  params: {
    name: { type: 'string', description: 'Page name', required: true }
  },
  execute: (figma, { name }) => {
    const page = figma.createPage()
    page.name = name
    return { id: page.id, name }
  }
})

export const createVector = defineTool({
  name: 'create_vector',
  mutates: true,
  description: 'Create a vector node with optional path data.',
  params: {
    x: { type: 'number', description: 'X position', required: true },
    y: { type: 'number', description: 'Y position', required: true },
    name: { type: 'string', description: 'Node name' },
    path: { type: 'string', description: 'VectorNetwork JSON' },
    fill: { type: 'color', description: 'Fill color (hex)' },
    stroke: { type: 'color', description: 'Stroke color (hex)' },
    stroke_weight: { type: 'number', description: 'Stroke weight' },
    parent_id: { type: 'string', description: 'Parent node ID' }
  },
  execute: (figma, args) => {
    const node = figma.createVector()
    node.x = args.x
    node.y = args.y
    if (args.name) node.name = args.name
    if (args.path) {
      figma.graph.updateNode(node.id, { vectorNetwork: JSON.parse(args.path) } as any)
    }
    if (args.fill) {
      node.fills = [{ type: 'SOLID', color: parseColor(args.fill), opacity: 1, visible: true }]
    }
    if (args.stroke) {
      node.strokes = [
        {
          color: parseColor(args.stroke),
          weight: args.stroke_weight ?? 1,
          opacity: 1,
          visible: true,
          align: 'CENTER'
        }
      ]
    }
    if (args.parent_id) {
      const parent = figma.getNodeById(args.parent_id)
      if (parent) parent.appendChild(node)
    }
    return nodeSummary(node)
  }
})

export const createSlice = defineTool({
  name: 'create_slice',
  mutates: true,
  description: 'Create a slice (export region) on the canvas.',
  params: {
    x: { type: 'number', description: 'X position', required: true },
    y: { type: 'number', description: 'Y position', required: true },
    width: { type: 'number', description: 'Width', required: true, min: 1 },
    height: { type: 'number', description: 'Height', required: true, min: 1 },
    name: { type: 'string', description: 'Slice name' },
    parent_id: { type: 'string', description: 'Parent node ID' }
  },
  execute: (figma, args) => {
    const node = figma.createFrame()
    node.x = args.x
    node.y = args.y
    node.resize(args.width, args.height)
    node.name = args.name ?? 'Slice'
    node.fills = []
    if (args.parent_id) {
      const parent = figma.getNodeById(args.parent_id)
      if (parent) parent.appendChild(node)
    }
    return nodeSummary(node)
  }
})
