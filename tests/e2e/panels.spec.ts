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

test('left rail is collapsed to 48px by default', async () => {
  const rail = page.locator('[data-test-id="left-rail"]')
  await expect(rail).toBeVisible()
  const box = await rail.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeLessThanOrEqual(50)
  await expect(page.locator('[data-test-id="left-rail-layers"]')).toBeVisible()
  await expect(page.locator('[data-test-id="left-rail-design"]')).toBeVisible()
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
