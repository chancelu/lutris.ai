import { defineTool, nodeSummary } from './schema'
import { parseColor } from '../color'
import type { VectorNetwork } from '../scene-graph'

/**
 * Stroke-based icon library (24×24 viewbox, Lucide-style).
 * Each icon is a VectorNetwork with vertices, segments, and regions.
 * Tangents {x:0,y:0} = straight line segments.
 */

const T0 = { x: 0, y: 0 }

// Helper: build a simple polyline (open path, no regions)
function polyline(...pts: [number, number][]): VectorNetwork {
  const vertices = pts.map(([x, y]) => ({ x, y }))
  const segments = []
  for (let i = 0; i < pts.length - 1; i++) {
    segments.push({ start: i, end: i + 1, tangentStart: T0, tangentEnd: T0 })
  }
  return { vertices, segments, regions: [] }
}

// Helper: merge multiple networks into one
function merge(...nets: VectorNetwork[]): VectorNetwork {
  const vertices: VectorNetwork['vertices'] = []
  const segments: VectorNetwork['segments'] = []
  const regions: VectorNetwork['regions'] = []
  for (const n of nets) {
    const off = vertices.length
    vertices.push(...n.vertices)
    segments.push(...n.segments.map(s => ({
      ...s, start: s.start + off, end: s.end + off
    })))
    regions.push(...n.regions.map(r => ({
      ...r, loops: r.loops.map(l => l.map(i => i + segments.length - n.segments.length + i - i))
    })))
  }
  // Fix region loop indices properly
  let segOff = 0
  const fixedRegions: VectorNetwork['regions'] = []
  let vOff = 0
  for (const n of nets) {
    for (const r of n.regions) {
      fixedRegions.push({
        ...r,
        loops: r.loops.map(l => l.map(i => i + segOff))
      })
    }
    segOff += n.segments.length
    vOff += n.vertices.length
  }
  return { vertices, segments, regions: fixedRegions }
}

// Closed shape helper: polyline that closes back to start, with a filled region
function closedShape(...pts: [number, number][]): VectorNetwork {
  const vertices = pts.map(([x, y]) => ({ x, y }))
  const segments = []
  for (let i = 0; i < pts.length; i++) {
    segments.push({ start: i, end: (i + 1) % pts.length, tangentStart: T0, tangentEnd: T0 })
  }
  const loop = segments.map((_, i) => i)
  return { vertices, segments, regions: [{ windingRule: 'NONZERO', loops: [loop] }] }
}

// Circle approximation with cubic bezier (4 arcs)
function circle(cx: number, cy: number, r: number): VectorNetwork {
  const k = r * 0.5523 // bezier approximation constant
  const vertices = [
    { x: cx, y: cy - r },     // top
    { x: cx + r, y: cy },     // right
    { x: cx, y: cy + r },     // bottom
    { x: cx - r, y: cy },     // left
  ]
  const segments = [
    { start: 0, end: 1, tangentStart: { x: k, y: 0 }, tangentEnd: { x: 0, y: -k } },
    { start: 1, end: 2, tangentStart: { x: 0, y: k }, tangentEnd: { x: k, y: 0 } },
    { start: 2, end: 3, tangentStart: { x: -k, y: 0 }, tangentEnd: { x: 0, y: k } },
    { start: 3, end: 0, tangentStart: { x: 0, y: -k }, tangentEnd: { x: -k, y: 0 } },
  ]
  return { vertices, segments, regions: [{ windingRule: 'NONZERO', loops: [[0, 1, 2, 3]] }] }
}

export const ICONS: Record<string, VectorNetwork> = {
  // Navigation
  home: merge(polyline([3,9],[12,2],[21,9]), polyline([4,10],[4,20],[10,20],[10,14],[14,14],[14,20],[20,20],[20,10])),
  'arrow-left': merge(polyline([19,12],[5,12]), polyline([12,19],[5,12],[12,5])),
  'arrow-right': merge(polyline([5,12],[19,12]), polyline([12,5],[19,12],[12,19])),
  'chevron-left': polyline([15,18],[9,12],[15,6]),
  'chevron-right': polyline([9,6],[15,12],[9,18]),
  'chevron-down': polyline([6,9],[12,15],[18,9]),
  menu: merge(polyline([3,12],[21,12]), polyline([3,6],[21,6]), polyline([3,18],[21,18])),

  // Actions
  search: merge(circle(11, 11, 8), polyline([21,21],[16.65,16.65])),
  plus: merge(polyline([12,5],[12,19]), polyline([5,12],[19,12])),
  minus: polyline([5,12],[19,12]),
  x: merge(polyline([18,6],[6,18]), polyline([6,6],[18,18])),
  check: polyline([20,6],[9,17],[4,12]),
  edit: merge(polyline([11,4],[4,4],[4,20],[20,20],[20,13]), polyline([18.5,2.5],[21.5,5.5],[12,15],[8,15],[8,11],[17.5,1.5])),

  // Common UI
  user: merge(circle(12, 8, 4), polyline([4,20],[4,18],[8,14],[16,14],[20,18],[20,20])),
  users: merge(circle(9, 7, 4), polyline([2,21],[2,19],[6,15],[12,15],[16,19],[16,21]), circle(19, 7, 3), polyline([17,14],[21,18],[22,21])),
  settings: merge(circle(12, 12, 3), polyline([12,2],[12,4]), polyline([12,20],[12,22]), polyline([2,12],[4,12]), polyline([20,12],[22,12]), polyline([4.93,4.93],[6.34,6.34]), polyline([17.66,17.66],[19.07,19.07]), polyline([4.93,19.07],[6.34,17.66]), polyline([17.66,6.34],[19.07,4.93])),
  heart: polyline([12,21],[3,13],[3,8],[6,4],[10,4],[12,7],[14,4],[18,4],[21,8],[21,13],[12,21]),
  star: polyline([12,2],[15.09,8.26],[22,9.27],[17,14.14],[18.18,21.02],[12,17.77],[5.82,21.02],[7,14.14],[2,9.27],[8.91,8.26],[12,2]),
  bell: merge(polyline([10,21],[14,21]), polyline([18,8],[18,13],[21,17],[3,17],[6,13],[6,8],[6,5],[9,3],[12,3],[15,3],[18,5])),
  mail: merge(closedShape([2,4],[22,4],[22,20],[2,20]), polyline([2,4],[12,13],[22,4])),
  phone: closedShape([5,2],[8,2],[9,6],[7,8],[9,12],[12,15],[16,15],[18,13],[22,16],[22,19],[20,22],[4,22],[2,19],[2,5]),
  calendar: merge(closedShape([3,4],[21,4],[21,22],[3,22]), polyline([16,2],[16,6]), polyline([8,2],[8,6]), polyline([3,10],[21,10])),
  clock: merge(circle(12, 12, 10), polyline([12,6],[12,12],[16,14])),

  // Media
  image: merge(closedShape([3,3],[21,3],[21,21],[3,21]), circle(8.5, 8.5, 2.5), polyline([21,15],[16,10],[5,21])),
  camera: merge(polyline([4,7],[4,20],[20,20],[20,7],[17,7],[15,4],[9,4],[7,7],[4,7]), circle(12, 13, 3)),
  play: closedShape([5,3],[19,12],[5,21]),
  pause: merge(closedShape([6,4],[10,4],[10,20],[6,20]), closedShape([14,4],[18,4],[18,20],[14,20])),

  // Files
  file: polyline([14,2],[6,2],[6,22],[18,22],[18,6],[14,2],[14,6],[18,6]),
  folder: polyline([2,4],[2,20],[22,20],[22,8],[12,8],[10,4],[2,4]),
  download: merge(polyline([12,3],[12,15]), polyline([5,12],[12,19],[19,12]), polyline([3,21],[21,21])),
  upload: merge(polyline([12,19],[12,7]), polyline([5,14],[12,7],[19,14]), polyline([3,21],[21,21])),
  trash: merge(polyline([3,6],[21,6]), polyline([8,6],[8,3],[16,3],[16,6]), polyline([5,6],[6,21],[18,21],[19,6]), polyline([10,10],[10,17]), polyline([14,10],[14,17])),
  copy: merge(polyline([8,4],[4,4],[4,16],[8,16]), closedShape([8,8],[20,8],[20,20],[8,20])),

  // Communication
  'message-circle': merge(circle(12, 11, 9), polyline([8,20],[12,17])),
  send: merge(polyline([22,2],[15,22],[11,13],[2,9],[22,2]), polyline([11,13],[22,2])),
  share: merge(circle(18, 5, 3), circle(6, 12, 3), circle(18, 19, 3), polyline([8.59,13.51],[15.42,17.49]), polyline([15.41,6.51],[8.59,10.49])),

  // Status
  'alert-circle': merge(circle(12, 12, 10), polyline([12,8],[12,12]), polyline([12,16],[12,16.01])),
  'check-circle': merge(circle(12, 12, 10), polyline([9,12],[11,14],[15,10])),
  info: merge(circle(12, 12, 10), polyline([12,16],[12,12]), polyline([12,8],[12,8.01])),
  eye: merge(polyline([1,12],[5,6],[12,4],[19,6],[23,12],[19,18],[12,20],[5,18],[1,12]), circle(12, 12, 3)),
  'eye-off': merge(polyline([1,1],[23,23]), polyline([17.94,17.94],[12,20],[5,18],[1,12],[5,6],[9,4.5]), polyline([14.12,4.08],[19,6],[23,12],[20,16.5]), circle(12, 12, 3)),

  // Layout
  grid: merge(polyline([3,3],[21,3],[21,21],[3,21],[3,3]), polyline([3,9],[21,9]), polyline([3,15],[21,15]), polyline([9,3],[9,21]), polyline([15,3],[15,21])),
  list: merge(polyline([8,6],[21,6]), polyline([8,12],[21,12]), polyline([8,18],[21,18]), polyline([3,6],[3.01,6]), polyline([3,12],[3.01,12]), polyline([3,18],[3.01,18])),
  filter: polyline([22,3],[2,3],[10,12.46],[10,19],[14,21],[14,12.46],[22,3]),
  'log-out': merge(polyline([9,21],[5,21],[5,3],[9,3]), polyline([16,17],[21,12],[16,7]), polyline([21,12],[9,12])),
  'log-in': merge(polyline([15,3],[19,3],[19,21],[15,21]), polyline([10,7],[15,12],[10,17]), polyline([15,12],[3,12])),

  // Misc
  link: merge(polyline([10,13],[14,9],[16,7],[19,7],[21,9],[21,12],[19,14],[17,16]), polyline([14,11],[10,15],[8,17],[5,17],[3,15],[3,12],[5,10],[7,8])),
  'external-link': merge(polyline([18,13],[18,19],[5,19],[5,6],[11,6]), polyline([15,3],[21,3],[21,9]), polyline([10,14],[21,3])),
  refresh: merge(polyline([1,4],[1,10],[7,10]), polyline([23,20],[23,14],[17,14]), polyline([3.51,15],[7,19],[12,20],[17,19],[20.49,15]), polyline([20.49,9],[17,5],[12,4],[7,5],[3.51,9])),
  loader: merge(polyline([12,2],[12,6]), polyline([12,18],[12,22]), polyline([4.93,4.93],[7.76,7.76]), polyline([16.24,16.24],[19.07,19.07]), polyline([2,12],[6,12]), polyline([18,12],[22,12]), polyline([4.93,19.07],[7.76,16.24]), polyline([16.24,7.76],[19.07,4.93])),
  zap: polyline([13,2],[3,14],[12,14],[11,22],[21,10],[12,10],[13,2]),
  globe: merge(circle(12, 12, 10), polyline([2,12],[22,12]), polyline([12,2],[9,6],[8,12],[9,18],[12,22]), polyline([12,2],[15,6],[16,12],[15,18],[12,22])),
}

export const ICON_NAMES = Object.keys(ICONS)

export const createIcon = defineTool({
  name: 'create_icon',
  mutates: true,
  description: 'Create a vector icon from the built-in icon library. Returns a sized, colored vector node. Use this instead of emoji or unicode symbols for professional icons.',
  params: {
    name: {
      type: 'string', required: true,
      description: 'Icon name',
      enum: ICON_NAMES
    },
    x: { type: 'number', description: 'X position' },
    y: { type: 'number', description: 'Y position' },
    size: { type: 'number', description: 'Icon size in px (default 24)' },
    color: { type: 'color', description: 'Icon color hex (default #374151)' },
    parent_id: { type: 'string', description: 'Parent node ID' }
  },
  execute: (figma, args) => {
    const network = ICONS[args.name]
    if (!network) return { error: `Unknown icon "${args.name}". Available: ${ICON_NAMES.join(', ')}` }

    const size = args.size ?? 24
    const scale = size / 24
    const color = args.color ?? '#374151'

    // Scale the network to requested size
    const scaled: VectorNetwork = {
      vertices: network.vertices.map(v => ({ ...v, x: v.x * scale, y: v.y * scale })),
      segments: network.segments.map(s => ({
        ...s,
        tangentStart: { x: s.tangentStart.x * scale, y: s.tangentStart.y * scale },
        tangentEnd: { x: s.tangentEnd.x * scale, y: s.tangentEnd.y * scale }
      })),
      regions: network.regions
    }

    const node = figma.createVector()
    node.x = args.x ?? 0
    node.y = args.y ?? 0
    node.resize(size, size)
    node.name = args.name
    figma.graph.updateNode(node.id, { vectorNetwork: scaled } as any)

    // Apply stroke for line icons
    const c = parseColor(color)
    node.strokes = [{ color: c, weight: scale * 2, opacity: 1, visible: true, align: 'CENTER' }]
    node.fills = []

    if (args.parent_id) {
      const parent = figma.getNodeById(args.parent_id)
      if (parent) parent.appendChild(node)
    }

    return nodeSummary(node)
  }
})
