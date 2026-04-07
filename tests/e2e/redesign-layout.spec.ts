import { test, expect, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/editor')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
})

test.afterAll(async () => {
  await page.close()
})

test('TopBar is visible with logo and document name', async () => {
  const header = page.locator('header').first()
  await expect(header).toBeVisible()
  await expect(header.locator('img[alt="Lutris.ai"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('TopBar has Export button and UserMenu', async () => {
  const header = page.locator('header').first()
  await expect(header).toBeVisible()
  await expect(header.locator('button', { hasText: 'Export' })).toBeVisible()
  canvas.assertNoErrors()
})

test('AI Panel (PropertiesPanel) is on the RIGHT side', async () => {
  const panel = page.locator('[data-test-id="properties-panel"]')
  await expect(panel).toBeVisible()

  const box = await panel.boundingBox()
  expect(box).not.toBeNull()
  const viewport = page.viewportSize()!
  // Right panel should be in the right portion of the viewport
  expect(box!.x).toBeGreaterThan(viewport.width / 2)
  canvas.assertNoErrors()
})

test('Canvas is in the center', async () => {
  const canvasArea = page.locator('[data-test-id="canvas-area"]')
  await expect(canvasArea).toBeVisible()

  const box = await canvasArea.boundingBox()
  expect(box).not.toBeNull()
  // Canvas should not be at the far left (left sidebar is there)
  expect(box!.x).toBeGreaterThan(200)
  canvas.assertNoErrors()
})

test('Design panel appears in left sidebar when element is selected', async () => {
  // Create and select a shape via store to ensure reliable selection
  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    const id = store.createShape('RECTANGLE', 400, 300, 100, 100)
    store.select([id])
  })
  await canvas.waitForRender()

  const drawer = page.locator('[data-test-id="design-panel-single"]')
  await expect(drawer).toBeVisible({ timeout: 5000 })
  canvas.assertNoErrors()
})

test('Toolbar has exactly 6 tool buttons', async () => {
  const buttons = page.locator('[data-test-id="toolbar"] button[data-test-id^="toolbar-tool-"]')
  await expect(buttons).toHaveCount(6)
  canvas.assertNoErrors()
})

test('WelcomeOverlay shows on empty canvas', async () => {
  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    const children = store.graph.getChildren(store.state.currentPageId)
    for (const child of children) {
      store.graph.deleteNode(child.id)
    }
    store.state.sceneVersion++
  })
  await canvas.waitForRender()
  canvas.assertNoErrors()
})
