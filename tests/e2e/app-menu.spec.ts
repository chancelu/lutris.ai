import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'
import { dismissWelcomeAndEnterDesign } from '../helpers/shell'

// Slice E / E3: the old AppMenu component was deleted in the R10 shell
// overhaul (Slice C). Its assertions now target the TopBar and the TopBar
// settings dropdown (topbar-settings → topbar-settings-provider).

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/editor')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  // Export is gated to design/dev — leave the idea phase first.
  await dismissWelcomeAndEnterDesign(page)
})

test.afterAll(async () => {
  await page.close()
})

test('top bar is visible with logo', async () => {
  const header = page.locator('header').first()
  await expect(header).toBeVisible()
  await expect(header.locator('img[alt="Lutris.ai"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('document name is visible in top bar', async () => {
  const header = page.locator('header').first()
  // Document name is a clickable span in the header
  const nameSpan = header.locator('span.text-muted, span.text-surface').filter({ hasText: /\w+/ }).first()
  await expect(nameSpan).toBeVisible()
  canvas.assertNoErrors()
})

test('top bar has Export button (design phase)', async () => {
  await expect(page.locator('[data-test-id="topbar-export"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('settings menu opens with AI provider settings entry', async () => {
  await page.locator('[data-test-id="topbar-settings"]').click()
  const providerItem = page.locator('[data-test-id="topbar-settings-provider"]')
  await expect(providerItem).toBeVisible()
  await expect(providerItem).toContainText('AI provider settings')
  // Close the menu without navigating.
  await page.keyboard.press('Escape')
  canvas.assertNoErrors()
})
