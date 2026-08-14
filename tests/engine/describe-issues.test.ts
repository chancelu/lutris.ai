import { describe, expect, it } from 'bun:test'

import { SceneGraph, Frame, Text, Ellipse, renderTree, computeLayout, detectIssues } from '@llc3233149/core'

function createGraph(): SceneGraph {
  const g = new SceneGraph()
  g.addPage('Test')
  return g
}

describe('detectIssues — vertical text trap', () => {
  it('flags text squeezed into a narrow column', () => {
    const g = createGraph()
    const tree = Frame({
      name: 'Page',
      w: 390,
      h: 844,
      children: [Text({ name: 'Greeting', size: 24, w: 30, children: '上午好，打工人' })]
    })
    const root = renderTree(g, tree)
    computeLayout(g, root.id)

    const textNode = [...g.nodes.values()].find((n) => n.type === 'TEXT')!
    const issues = detectIssues(textNode, 8, g)
    expect(issues.some((i) => i.message.includes('vertical text'))).toBe(true)
  })

  it('does not flag normal auto-sized text', () => {
    const g = createGraph()
    const tree = Frame({
      name: 'Page',
      w: 390,
      h: 844,
      children: [Text({ name: 'Greeting', size: 24, children: '上午好，打工人' })]
    })
    const root = renderTree(g, tree)
    computeLayout(g, root.id)

    const textNode = [...g.nodes.values()].find((n) => n.type === 'TEXT')!
    const issues = detectIssues(textNode, 8, g)
    expect(issues.some((i) => i.message.includes('vertical text'))).toBe(false)
  })

  it('does not flag a legitimate multi-line paragraph', () => {
    const g = createGraph()
    const tree = Frame({
      name: 'Page',
      w: 390,
      h: 844,
      children: [
        Text({
          name: 'Body',
          size: 14,
          w: 320,
          children: '这是一段正常的多行正文，用来验证宽松的段落宽度不会被误判为竖排文字缺陷。'
        })
      ]
    })
    const root = renderTree(g, tree)
    computeLayout(g, root.id)

    const textNode = [...g.nodes.values()].find((n) => n.type === 'TEXT')!
    const issues = detectIssues(textNode, 8, g)
    expect(issues.some((i) => i.message.includes('vertical text'))).toBe(false)
  })
})


describe('detectIssues — geometry (overlap & overflow)', () => {
  it('flags sibling overlap in an absolute container', () => {
    const g = createGraph()
    const tree = Frame({
      name: 'Page',
      w: 390,
      h: 844,
      children: [
        Frame({ name: 'CardA', x: 20, y: 20, w: 200, h: 100, bg: '#FFFFFF' }),
        Frame({ name: 'CardB', x: 60, y: 60, w: 200, h: 100, bg: '#FFFFFF' })
      ]
    })
    const root = renderTree(g, tree)
    const issues = detectIssues(g.nodes.get(root.id)!, 8, g)
    expect(issues.some((i) => i.message.includes('Sibling overlap'))).toBe(true)
  })

  it('flags stacked duplicate frames rendered at the same position', () => {
    const g = createGraph()
    const tree = Frame({
      name: 'Page',
      w: 390,
      h: 844,
      children: [
        Frame({ name: '今日打卡', x: 20, y: 20, w: 350, h: 200, bg: '#FFFFFF' }),
        Frame({ name: '今日打卡', x: 22, y: 21, w: 350, h: 200, bg: '#FFFFFF' })
      ]
    })
    const root = renderTree(g, tree)
    const issues = detectIssues(g.nodes.get(root.id)!, 8, g)
    expect(issues.some((i) => i.message.includes('Stacked duplicate'))).toBe(true)
  })

  it('ignores decorative glow orbs sitting under content', () => {
    const g = createGraph()
    const tree = Frame({
      name: 'Page',
      w: 390,
      h: 844,
      children: [
        Ellipse({
          name: 'Glow orb',
          x: 0,
          y: 0,
          w: 300,
          h: 300,
          bg: 'radial-gradient(circle, #10B98133, #10B98100)'
        }),
        Frame({ name: 'Card', x: 40, y: 40, w: 200, h: 100, bg: '#FFFFFF' })
      ]
    })
    const root = renderTree(g, tree)
    const issues = detectIssues(g.nodes.get(root.id)!, 8, g)
    expect(issues.some((i) => i.message.includes('Sibling overlap'))).toBe(false)
  })

  it('ignores minor layering below the 12% threshold', () => {
    const g = createGraph()
    const tree = Frame({
      name: 'Page',
      w: 390,
      h: 844,
      children: [
        Frame({ name: 'Avatar', x: 20, y: 20, w: 48, h: 48, bg: '#10B981' }),
        Frame({ name: 'Badge', x: 56, y: 56, w: 14, h: 14, bg: '#EF4444' })
      ]
    })
    const root = renderTree(g, tree)
    const issues = detectIssues(g.nodes.get(root.id)!, 8, g)
    expect(issues.some((i) => i.message.includes('Sibling overlap'))).toBe(false)
  })

  it('flags children overflowing the parent right/bottom edge', () => {
    const g = createGraph()
    const tree = Frame({
      name: 'Page',
      w: 390,
      h: 844,
      children: [Frame({ name: 'WideCard', x: 20, y: 20, w: 500, h: 100, bg: '#FFFFFF' })]
    })
    const root = renderTree(g, tree)
    const issues = detectIssues(g.nodes.get(root.id)!, 8, g)
    expect(issues.some((i) => i.message.includes('overflows'))).toBe(true)
  })

  it('ignores overflow when the parent clips content', () => {
    const g = createGraph()
    const tree = Frame({
      name: 'Card',
      w: 200,
      h: 100,
      overflow: 'hidden',
      bg: '#FFFFFF',
      children: [Frame({ name: 'BleedImage', x: 0, y: 0, w: 260, h: 140, bg: '#10B981' })]
    })
    const root = renderTree(g, tree)
    const issues = detectIssues(g.nodes.get(root.id)!, 8, g)
    expect(issues.some((i) => i.message.includes('overflows'))).toBe(false)
  })

  it('does not check sibling overlap inside flex containers', () => {
    const g = createGraph()
    const tree = Frame({
      name: 'Page',
      w: 390,
      h: 844,
      flex: 'col',
      children: [
        Frame({ name: 'Row1', w: 350, h: 100, bg: '#FFFFFF' }),
        Frame({ name: 'Row2', w: 350, h: 100, bg: '#FFFFFF' })
      ]
    })
    const root = renderTree(g, tree)
    computeLayout(g, root.id)
    const issues = detectIssues(g.nodes.get(root.id)!, 8, g)
    expect(issues.some((i) => i.message.includes('Sibling overlap'))).toBe(false)
  })
})


describe('detectIssues — page-level hygiene', () => {
  it('flags stacked duplicate pages on the canvas', () => {
    const g = createGraph()
    const a = renderTree(g, Frame({ name: '今日打卡', x: 0, y: 0, w: 390, h: 844, bg: '#FFF' }))
    renderTree(g, Frame({ name: '今日打卡', x: 4, y: 2, w: 390, h: 844, bg: '#FFF' }))
    void a
    const page = [...g.nodes.values()].find((n) => n.type === 'CANVAS')!
    const issues = detectIssues(page, 8, g)
    expect(issues.some((i) => i.message.includes('Stacked duplicate'))).toBe(true)
  })

  it('ignores pages placed side by side', () => {
    const g = createGraph()
    renderTree(g, Frame({ name: '首页', x: 0, y: 0, w: 390, h: 844, bg: '#FFF' }))
    renderTree(g, Frame({ name: '统计', x: 450, y: 0, w: 390, h: 844, bg: '#FFF' }))
    const page = [...g.nodes.values()].find((n) => n.type === 'CANVAS')!
    const issues = detectIssues(page, 8, g)
    expect(issues.some((i) => i.message.includes('overlap') || i.message.includes('duplicate'))).toBe(false)
  })

  it('flags loose text directly on the canvas', () => {
    const g = createGraph()
    renderTree(g, Text({ name: 'Orphan', x: 100, y: 100, size: 14, children: '飘落的文字' }))
    const page = [...g.nodes.values()].find((n) => n.type === 'CANVAS')!
    const issues = detectIssues(page, 8, g)
    expect(issues.some((i) => i.message.includes('Loose text'))).toBe(true)
  })
})
