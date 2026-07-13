import { ref, computed } from 'vue'
import { parseFigFile } from '@llc3233149/core'

import type { SceneGraph, SceneNode } from '@llc3233149/core'

// ── Types ──

export interface AssetLibrary {
  id: string
  name: string
  graph: SceneGraph
  components: LibraryComponent[]
  colors: LibraryColor[]
  typography: LibraryTypography[]
}

export interface LibraryComponent {
  id: string
  name: string
  type: string
  nodeData: string
}

export interface LibraryColor {
  hex: string
  count: number
}

export interface LibraryTypography {
  family: string
  size: number
  weight: number
  count: number
}

// ── State ──

const libraries = ref<AssetLibrary[]>([])
const activeLibraryId = ref<string | null>(null)

const activeLibrary = computed(() =>
  libraries.value.find((l) => l.id === activeLibraryId.value) ?? null
)

// ── Helpers ──

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function extractComponents(graph: SceneGraph): LibraryComponent[] {
  const components: LibraryComponent[] = []
  for (const node of graph.getAllNodes()) {
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      components.push({
        id: node.id,
        name: node.name,
        type: node.type,
        nodeData: JSON.stringify(serializeNodeTree(graph, node))
      })
    }
  }
  return components
}

function serializeNodeTree(graph: SceneGraph, node: SceneNode): Record<string, unknown> {
  const childNodes = graph.getChildren(node.id)
  const children = childNodes.length > 0
    ? childNodes.map((n: SceneNode) => serializeNodeTree(graph, n))
    : undefined
  return {
    type: node.type,
    name: node.name,
    width: node.width,
    height: node.height,
    fills: node.fills,
    strokes: node.strokes,
    effects: node.effects,
    children
  }
}

function extractColors(graph: SceneGraph): LibraryColor[] {
  const colorMap = new Map<string, number>()
  for (const node of graph.getAllNodes()) {
    if (node.type === 'CANVAS') continue
    for (const fill of node.fills) {
      if (fill.type === 'SOLID') {
        const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b)
        colorMap.set(hex, (colorMap.get(hex) ?? 0) + 1)
      }
    }
    for (const stroke of node.strokes) {
      const hex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b)
      colorMap.set(hex, (colorMap.get(hex) ?? 0) + 1)
    }
  }
  return [...colorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([hex, count]) => ({ hex, count }))
}

function extractTypography(graph: SceneGraph): LibraryTypography[] {
  const styleMap = new Map<string, LibraryTypography>()
  for (const node of graph.getAllNodes()) {
    if (node.type !== 'TEXT') continue
    const key = `${node.fontFamily}|${node.fontSize}|${node.fontWeight}`
    const existing = styleMap.get(key)
    if (existing) {
      existing.count++
    } else {
      styleMap.set(key, {
        family: node.fontFamily || 'Unknown',
        size: node.fontSize || 16,
        weight: node.fontWeight || 400,
        count: 1
      })
    }
  }
  return [...styleMap.values()].sort((a, b) => b.count - a.count)
}

let nextId = 1

// ── Public API ──

async function loadLibrary(file: File): Promise<AssetLibrary> {
  const buffer = await file.arrayBuffer()
  const graph = await parseFigFile(buffer)

  const library: AssetLibrary = {
    id: `lib-${nextId++}`,
    name: file.name.replace(/\.fig$/i, ''),
    graph,
    components: extractComponents(graph),
    colors: extractColors(graph),
    typography: extractTypography(graph)
  }

  libraries.value = [...libraries.value, library]
  activeLibraryId.value = library.id
  return library
}

function removeLibrary(id: string) {
  libraries.value = libraries.value.filter((l) => l.id !== id)
  if (activeLibraryId.value === id) {
    activeLibraryId.value = libraries.value[0]?.id ?? null
  }
}

function setActiveLibrary(id: string) {
  activeLibraryId.value = id
}

export function useAssetLibrary() {
  return {
    libraries,
    activeLibrary,
    activeLibraryId,
    loadLibrary,
    removeLibrary,
    setActiveLibrary
  }
}
