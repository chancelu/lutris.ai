import { test, expect, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'
import { expandLeftRail } from '../helpers/shell'

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

test('welcome overlay shows on empty canvas in idea phase', async () => {
  const overlay = page.locator('[data-test-id="welcome-overlay"]')
  await expect(overlay).toBeVisible()
  await expect(overlay.locator('img[src="/lutris-otter.png"]')).toBeVisible()
  await expect(overlay).toContainText('What do you want to build?')
  // Export is gated to design/dev — hidden while in idea phase.
  await expect(page.locator('[data-test-id="topbar-export"]')).not.toBeVisible()
  canvas.assertNoErrors()
})

test('blank-canvas action dismisses overlay and lands in design phase', async () => {
  await page.locator('[data-test-id="welcome-blank-canvas"]').click()
  await expect(page.locator('[data-test-id="welcome-overlay"]')).not.toBeVisible()
  const phase = await page.evaluate(() => window.__OPEN_PENCIL_PIPELINE__!.currentPhase)
  expect(phase).toBe('design')
  canvas.assertNoErrors()
})

test('TopBar is visible with logo and document name', async () => {
  const header = page.locator('header').first()
  await expect(header).toBeVisible()
  await expect(header.locator('img[alt="Lutris.ai"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('TopBar has Export button in design phase', async () => {
  await expect(page.locator('[data-test-id="topbar-export"]')).toBeVisible()
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

test('Canvas starts after the collapsed 48px rail', async () => {
  const canvasArea = page.locator('[data-test-id="canvas-area"]')
  await expect(canvasArea).toBeVisible()

  const box = await canvasArea.boundingBox()
  expect(box).not.toBeNull()
  // R10 shell: the left rail is 48px when collapsed (was a 280px sidebar).
  expect(box!.x).toBeLessThan(100)
  canvas.assertNoErrors()
})

test('Design panel appears after expanding the rail and selecting an element', async () => {
  // Create and select a shape via store to ensure reliable selection
  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    const id = store.createShape('RECTANGLE', 400, 300, 100, 100)
    store.select([id])
  })
  await canvas.waitForRender()

  // Rail is collapsed by default — the design panel needs an explicit expand.
  await expect(page.locator('[data-test-id="left-rail"]')).toBeVisible()
  await expandLeftRail(page, 'design')

  const drawer = page.locator('[data-test-id="design-panel-single"]')
  await expect(drawer).toBeVisible({ timeout: 5000 })
  canvas.assertNoErrors()
})

test('Toolbar has exactly 6 tool buttons', async () => {
  const buttons = page.locator('[data-test-id="toolbar"] button[data-test-id^="toolbar-tool-"]')
  await expect(buttons).toHaveCount(6)
  canvas.assertNoErrors()
})

test('WelcomeOverlay stays gone once the canvas has content and phase left idea', async () => {
  await expect(page.locator('[data-test-id="welcome-overlay"]')).not.toBeVisible()
  canvas.assertNoErrors()
})
