import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '../../packages/core/src/scene-graph'
import { selectionToCode } from '../../packages/core/src/render/export-code'

function makeTestGraph() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id

  // Frame with auto-layout
  const frame = graph.createNode('FRAME', pageId, {
    name: 'Card',
    x: 0, y: 0, width: 320, height: 200,
    layoutMode: 'VERTICAL',
    itemSpacing: 16,
    paddingTop: 24, paddingRight: 24, paddingBottom: 24, paddingLeft: 24,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
    cornerRadius: 12,
  })

  // Text child
  graph.createNode('TEXT', frame.id, {
    name: 'Title',
    x: 0, y: 0, width: 272, height: 24,
    characters: 'Hello World',
    fontSize: 24,
    fontFamily: 'Inter',
    fontWeight: 700,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, opacity: 1, visible: true }],
  })

  // Nested frame
  const inner = graph.createNode('FRAME', frame.id, {
    name: 'Actions',
    x: 0, y: 0, width: 272, height: 40,
    layoutMode: 'HORIZONTAL',
    itemSpacing: 8,
    fills: [],
  })

  graph.createNode('TEXT', inner.id, {
    name: 'Button Label',
    x: 0, y: 0, width: 80, height: 40,
    characters: 'Click me',
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: 500,
    fills: [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, opacity: 1, visible: true }],
  })

  return { graph, frameId: frame.id }
}

describe('selectionToCode', () => {
  // ── HTML format ──

  test('generates valid HTML document', () => {
    const { graph, frameId } = makeTestGraph()
    const html = selectionToCode([frameId], graph, 'html')

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html lang="en">')
    expect(html).toContain('<style>')
    expect(html).toContain('</style>')
    expect(html).toContain('Hello World')
    expect(html).toContain('Click me')
  })

  test('HTML includes CSS with flex layout', () => {
    const { graph, frameId } = makeTestGraph()
    const html = selectionToCode([frameId], graph, 'html')

    expect(html).toContain('display: flex')
    expect(html).toContain('flex-direction: column')
    expect(html).toContain('gap: 16px')
    expect(html).toContain('padding: 24px')
  })

  test('HTML includes background and border-radius', () => {
    const { graph, frameId } = makeTestGraph()
    const html = selectionToCode([frameId], graph, 'html')

    expect(html).toContain('background: #FFFFFF')
    expect(html).toContain('border-radius: 12px')
  })

  test('HTML includes text styles', () => {
    const { graph, frameId } = makeTestGraph()
    const html = selectionToCode([frameId], graph, 'html')

    expect(html).toContain('font-size: 24px')
    expect(html).toContain("font-family: 'Inter', sans-serif")
    expect(html).toContain('font-weight: 700')
  })

  // ── Vue SFC format ──

  test('generates valid Vue SFC', () => {
    const { graph, frameId } = makeTestGraph()
    const vue = selectionToCode([frameId], graph, 'vue-sfc')

    expect(vue).toContain('<script setup lang="ts">')
    expect(vue).toContain('</script>')
    expect(vue).toContain('<template>')
    expect(vue).toContain('</template>')
    expect(vue).toContain('<style scoped>')
    expect(vue).toContain('</style>')
  })

  test('Vue SFC contains component markup', () => {
    const { graph, frameId } = makeTestGraph()
    const vue = selectionToCode([frameId], graph, 'vue-sfc')

    expect(vue).toContain('Hello World')
    expect(vue).toContain('Click me')
    expect(vue).toContain('class="')
  })

  test('Vue SFC contains scoped CSS', () => {
    const { graph, frameId } = makeTestGraph()
    const vue = selectionToCode([frameId], graph, 'vue-sfc')

    expect(vue).toContain('display: flex')
    expect(vue).toContain('border-radius: 12px')
  })

  // ── React format ──

  test('generates valid React component', () => {
    const { graph, frameId } = makeTestGraph()
    const react = selectionToCode([frameId], graph, 'react')

    expect(react).toContain("import './styles.css'")
    expect(react).toContain('export function Card()')
    expect(react).toContain('return (')
    expect(react).toContain('className="')
  })

  test('React component contains JSX markup', () => {
    const { graph, frameId } = makeTestGraph()
    const react = selectionToCode([frameId], graph, 'react')

    expect(react).toContain('Hello World')
    expect(react).toContain('Click me')
  })

  test('React component includes CSS in comment', () => {
    const { graph, frameId } = makeTestGraph()
    const react = selectionToCode([frameId], graph, 'react')

    expect(react).toContain('/* styles.css */')
    expect(react).toContain('display: flex')
  })

  // ── Edge cases ──

  test('returns empty string for empty selection', () => {
    const graph = new SceneGraph()
    expect(selectionToCode([], graph, 'html')).toBe('')
  })

  test('returns empty string for non-existent node', () => {
    const graph = new SceneGraph()
    expect(selectionToCode(['non-existent'], graph, 'html')).toBe('')
  })

  test('wraps multiple nodes in container', () => {
    const { graph, frameId } = makeTestGraph()
    const childIds = graph.getChildren(frameId).map(n => n.id)
    const html = selectionToCode(childIds, graph, 'html')

    expect(html).toContain('container-0')
  })

  test('sanitizes component name for React', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      name: 'my-cool component/v2',
      x: 0, y: 0, width: 100, height: 100,
      fills: [],
    })
    const react = selectionToCode([frame.id], graph, 'react')
    expect(react).toContain('export function MyCoolComponentV2()')
  })

  test('handles nested auto-layout correctly', () => {
    const { graph, frameId } = makeTestGraph()
    const html = selectionToCode([frameId], graph, 'html')

    // Inner "Actions" frame should have horizontal flex
    expect(html).toContain('gap: 8px')
    // Should have the actions class
    const actionsCSS = html.split('actions-')[1]
    expect(actionsCSS).toBeDefined()
  })

  test('escapes HTML entities in text', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const textNode = graph.createNode('TEXT', pageId, {
      name: 'Special',
      x: 0, y: 0, width: 100, height: 20,
      characters: 'Price: <$5 & >$3',
      fontSize: 14,
      fills: [],
    })
    const html = selectionToCode([textNode.id], graph, 'html')

    expect(html).toContain('&lt;')
    expect(html).toContain('&gt;')
    expect(html).toContain('&amp;')
  })
})
