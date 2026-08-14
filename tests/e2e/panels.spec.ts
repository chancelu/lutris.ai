import { test, expect, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'
import { dismissWelcomeAndEnterDesign, expandLeftRail } from '../helpers/shell'

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/editor')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  // Canvas chrome (left rail) only exists in design/dev.
  await dismissWelcomeAndEnterDesign(page)
})

test.afterAll(async () => {
  await page.close()
})

test('properties panel (AI panel) is visible on the right', async () => {
  const panel = page.locator('[data-test-id="properties-panel"]')
  await expect(panel).toBeVisible()

  const box = await panel.boundingBox()
  expect(box).not.toBeNull()
  // Right panel should be positioned past the center of the viewport
  const viewport = page.viewportSize()!
  expect(box!.x).toBeGreaterThan(viewport.width / 2)
  canvas.assertNoErrors()
})

test('tool dock is a floating horizontal pill at bottom center with tools and layers', async () => {
  const dock = page.locator('[data-test-id="tool-dock"]')
  await expect(dock).toBeVisible()
  const box = await dock.boundingBox()
  expect(box).not.toBeNull()
  // R15: 横向悬浮 dock——矮、宽、位于视口下半部且水平居中附近
  const viewport = page.viewportSize()!
  expect(box!.height).toBeLessThanOrEqual(56)
  expect(box!.width).toBeGreaterThan(box!.height)
  expect(box!.y).toBeGreaterThan(viewport.height / 2)
  const center = box!.x + box!.width / 2
  expect(Math.abs(center - viewport.width / 2)).toBeLessThan(viewport.width * 0.2)
  await expect(page.locator('[data-test-id="tool-dock-layers"]')).toBeVisible()
  await expect(dock.locator('[data-test-id="toolbar-tool-select"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('layers panel appears after expanding the rail', async () => {
  await expandLeftRail(page, 'layers')
  await expect(page.locator('[data-test-id="layers-panel"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('chat panel is the default content in properties panel', async () => {
  const chatPanel = page.locator('[data-test-id="chat-panel"]')
  await expect(chatPanel).toBeVisible()
  canvas.assertNoErrors()
})
