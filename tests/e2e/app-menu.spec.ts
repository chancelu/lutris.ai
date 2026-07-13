import { expect, test, type Page } from '@playwright/test'

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

test('top bar is visible with logo', async () => {
  const header = page.locator('header').first()
  await expect(header).toBeVisible()
  await expect(header.locator('img[alt="Lutris.ai"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('top bar has Export button', async () => {
  const header = page.locator('header').first()
  await expect(header.locator('button', { hasText: 'Export' })).toBeVisible()
  canvas.assertNoErrors()
})

test('document name is visible in top bar', async () => {
  const header = page.locator('header').first()
  // Document name is a clickable span in the header
  const nameSpan = header.locator('span.text-muted, span.text-surface').filter({ hasText: /\w+/ }).first()
  await expect(nameSpan).toBeVisible()
  canvas.assertNoErrors()
})
