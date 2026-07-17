import { test, expect, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'
import { dismissWelcomeAndEnterDesign } from '../helpers/shell'

// Slice E / E3: the e2e dev server runs keyless (VITE_AI_* stripped), so the
// AI flow starts at ProviderSetup; a dummy key unlocks the chat UI without
// any network access.

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/editor')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await dismissWelcomeAndEnterDesign(page)
  // Unlock the chat UI with a dummy key (no LLM calls are made).
  await page.locator('[data-test-id="api-key-input"]').fill('sk-or-test-key-12345')
  await page.locator('[data-test-id="api-key-save"]').click()
})

test.afterAll(async () => {
  await page.close()
})

test('chat input is visible in AI Panel', async () => {
  const chatPanel = page.locator('[data-test-id="chat-panel"]')
  await expect(chatPanel).toBeVisible()
  canvas.assertNoErrors()
})

test('chat input field exists', async () => {
  const chatInput = page.locator('[data-test-id="chat-input"]')
  await expect(chatInput).toBeVisible()
  canvas.assertNoErrors()
})

test('Spec view button in panel header toggles SpecPanel', async () => {
  // R10 shell: the Spec view switch lives in the properties-panel header
  // (the old bottom-bar Spec toggle was removed).
  const specButton = page.locator('[data-test-id="panel-view-spec"]')
  await expect(specButton).toBeVisible()
  await specButton.click()
  await canvas.waitForRender()

  const specPanel = page.locator('[data-test-id="product-doc-panel"]')
  await expect(specPanel).toBeVisible({ timeout: 3000 })

  // Back to chat
  await page.locator('[data-test-id="panel-view-chat"]').click()
  await canvas.waitForRender()
  await expect(page.locator('[data-test-id="chat-panel"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('TopBar Export button opens the Export view', async () => {
  // Export requires canvas content; create a shape first.
  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    store.createShape('RECTANGLE', 100, 100, 120, 80)
  })
  await canvas.waitForRender()

  await page.locator('[data-test-id="topbar-export"]').click()
  await canvas.waitForRender()

  // Export view is open (header shows its close button); close it again.
  await expect(page.locator('[data-test-id="panel-export-close"]')).toBeVisible()
  await page.locator('[data-test-id="panel-export-close"]').click()
  await canvas.waitForRender()
  await expect(page.locator('[data-test-id="chat-panel"]')).toBeVisible()
  canvas.assertNoErrors()
})
