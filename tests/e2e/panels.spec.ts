import { test, expect, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
})

test.afterAll(async () => {
  await page.close()
})

test('properties panel (AI panel) is visible on the left', async () => {
  const panel = page.locator('[data-test-id="properties-panel"]')
  await expect(panel).toBeVisible()

  const box = await panel.boundingBox()
  expect(box).not.toBeNull()
  // Left panel should be positioned at or near the left edge
  expect(box!.x).toBeLessThan(400)
  canvas.assertNoErrors()
})

test('Cmd+Backslash hides panels', async () => {
  await page.keyboard.press('Meta+\\')
  await canvas.waitForRender()

  await expect(page.locator('[data-test-id="layers-panel"]')).not.toBeVisible()
  canvas.assertNoErrors()
})

test('Cmd+Backslash shows panels again', async () => {
  await page.keyboard.press('Meta+\\')
  await canvas.waitForRender()

  await expect(page.locator('[data-test-id="layers-panel"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('chat panel is the default content in properties panel', async () => {
  const chatPanel = page.locator('[data-test-id="chat-panel"]')
  await expect(chatPanel).toBeVisible()
  canvas.assertNoErrors()
})
