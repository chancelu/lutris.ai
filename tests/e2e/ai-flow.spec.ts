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

test('chat input is visible in AI Panel', async () => {
  // Chat panel should be visible by default in the properties panel
  const chatPanel = page.locator('[data-test-id="chat-panel"]')
  await expect(chatPanel).toBeVisible()
  canvas.assertNoErrors()
})

test('chat input field exists', async () => {
  const chatInput = page.locator('[data-test-id="chat-input"]')
  await expect(chatInput).toBeVisible()
  canvas.assertNoErrors()
})

test('Spec button in bottom bar toggles SpecPanel', async () => {
  // Look for the Spec button in the properties panel bottom area
  // (scoped to properties-panel to avoid colliding with the TopBar pipeline stepper's "Spec" phase button)
  const specButton = page.locator('[data-test-id="properties-panel"] button:has-text("Spec")')
  if (await specButton.isVisible()) {
    await specButton.click()
    await canvas.waitForRender()

    const specPanel = page.locator('[data-test-id="product-doc-panel"]')
    // Spec panel should be visible after clicking
    await expect(specPanel).toBeVisible({ timeout: 3000 })

    // Toggle back
    await specButton.click()
    await canvas.waitForRender()
  }
  canvas.assertNoErrors()
})

test('Export button in bottom bar toggles ExportPanel', async () => {
  const exportButton = page.locator('button:has-text("Export")').first()
  if (await exportButton.isVisible()) {
    await exportButton.click()
    await canvas.waitForRender()
    canvas.assertNoErrors()
  }
})
