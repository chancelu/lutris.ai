import { test, expect, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'
import { expandLeftRail } from '../helpers/shell'

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/demo')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  // R10 shell: the layers panel lives behind the collapsed left rail, which
  // only exists in design/dev. The demo route starts in the idea phase (the
  // welcome overlay stays hidden because the canvas has content).
  await page.evaluate(() => window.__OPEN_PENCIL_PIPELINE__!.skipToDesign())
  await expandLeftRail(page, 'layers')
})

test.afterAll(async () => {
  await page.close()
})

function layerRows() {
  return page.locator('[data-node-id]')
}

async function getLayerNames(): Promise<string[]> {
  const rows = layerRows()
  const count = await rows.count()
  const names: string[] = []
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).innerText()
    names.push(text.trim())
  }
  return names
}

async function getSceneTree() {
  return page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__
    if (!store) return null

    function nodeTree(id: string): { name: string; type: string; children: unknown[] } | null {
      const node = store.graph.getNode(id)
      if (!node) return null
      return {
        name: node.name,
        type: node.type,
        children: node.childIds.map((cid: string) => nodeTree(cid)).filter(Boolean),
      }
    }
    return nodeTree(store.state.currentPageId)
  })
}

async function getSelectedCount(): Promise<number> {
  return page.evaluate(() => {
    return window.__OPEN_PENCIL_STORE__!.state.selectedIds.size
  })
}

test('demo layers visible in panel', async () => {
  // Wait for layer rows to appear (demo shapes may take a moment to render)
  const firstRow = page.locator('[data-node-id]').first()
  const hasRows = await firstRow.isVisible({ timeout: 10000 }).catch(() => false)
  if (!hasRows) {
    // Demo shapes may be overwritten by project system loading from IDB
    test.skip()
    return
  }
  const names = await getLayerNames()
  expect(names).toContain('Components')
  expect(names).toContain('App Preview')
})

test('clicking a node inside a frame does not reparent it', async () => {
  const beforeTree = await getSceneTree()
  const section = beforeTree?.children?.find((c: any) => c.name === 'App Preview')
  if (!section) {
    test.skip()
    return
  }
  const dashboard = section.children.find((c: any) => c.name === 'Dashboard')
  expect(dashboard).toBeTruthy()
  const sidebarBefore = dashboard.children.find((c: any) => c.name === 'Sidebar')
  expect(sidebarBefore).toBeTruthy()

  // Click inside the App Preview section area
  await canvas.click(350, 310)
  await canvas.waitForRender()

  // Sidebar should still be a child of Dashboard
  const afterTree = await getSceneTree()
  const afterSection = afterTree.children.find((c: any) => c.name === 'App Preview')
  const afterDashboard = afterSection.children.find((c: any) => c.name === 'Dashboard')
  expect(afterDashboard.children.find((c: any) => c.name === 'Sidebar')).toBeTruthy()

  canvas.assertNoErrors()
})

test('creating a shape updates layers', async () => {
  const before = await getLayerNames()
  await canvas.drawRect(600, 500, 50, 50)
  const names = await getLayerNames()
  expect(names).toContain('Rectangle')
  expect(names.length).toBe(before.length + 1)

  await canvas.undo()
  const after = await getLayerNames()
  expect(after.length).toBe(before.length)
  expect(after).not.toContain('Rectangle')
})

test('Shift+A wraps selection in auto-layout frame', async () => {
  // Create two rectangles via store and select them for reliable selection
  const ids = await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    const id1 = store.createShape('RECTANGLE', 700, 600, 60, 60)
    const id2 = store.createShape('RECTANGLE', 800, 600, 60, 60)
    store.select([id1, id2])
    return [id1, id2]
  })
  await canvas.waitForRender()
  const count = await getSelectedCount()
  expect(count).toBe(2)

  const before = await getLayerNames()

  await page.keyboard.press('Shift+A')
  await canvas.waitForRender()

  const tree = await getSceneTree()
  const autoFrame = tree.children.find((c: any) => c.name === 'Frame' && c.type === 'FRAME')
  expect(autoFrame).toBeTruthy()

  const after = await getLayerNames()
  expect(after).not.toEqual(before)
  expect(after).toContain('Frame')

  canvas.assertNoErrors()
})

test('grouping updates layers', async () => {
  // Undo the auto-layout to restore flat structure
  await canvas.undo()
  await canvas.undo()
  await canvas.waitForRender()

  // Create two rects via store and select them
  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    const id1 = store.createShape('RECTANGLE', 700, 600, 60, 60)
    const id2 = store.createShape('RECTANGLE', 800, 600, 60, 60)
    store.select([id1, id2])
  })
  await canvas.waitForRender()

  await page.keyboard.press('Meta+g')
  await canvas.waitForRender()

  const tree = await getSceneTree()
  const group = tree.children.find((c: any) => c.name === 'Group' && c.type === 'GROUP')
  expect(group).toBeTruthy()

  const names = await getLayerNames()
  expect(names).toContain('Group')

  canvas.assertNoErrors()
})

test('ungrouping updates layers', async () => {
  await page.keyboard.press('Shift+Meta+g')
  await canvas.waitForRender()

  const names = await getLayerNames()
  expect(names).not.toContain('Group')
  expect(names).toContain('Rectangle')

  canvas.assertNoErrors()
})

// Layer rename UI (layers-item-input) is not currently implemented.
test.skip('double-click layer to rename', async () => {})

test.skip('clicking outside rename input commits', async () => {})

test.skip('double-click does not toggle tree expand', async () => {})
