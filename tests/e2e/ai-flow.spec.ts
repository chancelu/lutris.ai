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

test('jumping to spec phase shows the Spec Studio in the main area', async () => {
  // R12: Spec is no longer a right-column tab — it's a first-class main-area
  // view (Spec Studio). The right column keeps the chat alive.
  const jumped = await page.evaluate(() => window.__OPEN_PENCIL_PIPELINE__!.jumpToPhase('spec'))
  expect(jumped).toBe(true)
  await canvas.waitForRender()

  await expect(page.locator('[data-test-id="spec-studio"]')).toBeVisible({ timeout: 3000 })
  await expect(page.locator('[data-test-id="spec-add-page"]')).toBeVisible()
  await expect(page.locator('[data-test-id="chat-panel"]')).toBeVisible()

  // Back to design — Spec Studio leaves the main area again.
  await page.evaluate(() => window.__OPEN_PENCIL_PIPELINE__!.jumpToPhase('design'))
  await canvas.waitForRender()
  await expect(page.locator('[data-test-id="spec-studio"]')).not.toBeVisible()
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
