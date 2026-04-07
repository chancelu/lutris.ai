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

test('layers panel is visible on the left', async () => {
  await expect(page.locator('[data-test-id="layers-panel"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('chat panel is the default content in properties panel', async () => {
  const chatPanel = page.locator('[data-test-id="chat-panel"]')
  await expect(chatPanel).toBeVisible()
  canvas.assertNoErrors()
})
