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

test('toolbar is visible', async () => {
  await expect(page.locator('[data-test-id="toolbar"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('toolbar has exactly 4 tool buttons', async () => {
  const buttons = page.locator('[data-test-id="toolbar"] button[data-test-id^="toolbar-tool-"]')
  await expect(buttons).toHaveCount(4)
  canvas.assertNoErrors()
})

test('toolbar contains SELECT, FRAME, TEXT, HAND tools', async () => {
  await expect(page.locator('[data-test-id="toolbar-tool-select"]')).toBeVisible()
  await expect(page.locator('[data-test-id="toolbar-tool-frame"]')).toBeVisible()
  await expect(page.locator('[data-test-id="toolbar-tool-text"]')).toBeVisible()
  await expect(page.locator('[data-test-id="toolbar-tool-hand"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('clicking SELECT tool activates it', async () => {
  await page.locator('[data-test-id="toolbar-tool-select"]').click()
  await canvas.waitForRender()

  const tool = await page.evaluate(() => window.__OPEN_PENCIL_STORE__!.state.activeTool)
  expect(tool).toBe('SELECT')
  canvas.assertNoErrors()
})

test('clicking FRAME tool activates it', async () => {
  await page.locator('[data-test-id="toolbar-tool-frame"]').click()
  await canvas.waitForRender()

  const tool = await page.evaluate(() => window.__OPEN_PENCIL_STORE__!.state.activeTool)
  expect(tool).toBe('FRAME')
  canvas.assertNoErrors()
})

test('clicking TEXT tool activates it', async () => {
  await page.locator('[data-test-id="toolbar-tool-text"]').click()
  await canvas.waitForRender()

  const tool = await page.evaluate(() => window.__OPEN_PENCIL_STORE__!.state.activeTool)
  expect(tool).toBe('TEXT')
  canvas.assertNoErrors()
})

test('clicking HAND tool activates it', async () => {
  await page.locator('[data-test-id="toolbar-tool-hand"]').click()
  await canvas.waitForRender()

  const tool = await page.evaluate(() => window.__OPEN_PENCIL_STORE__!.state.activeTool)
  expect(tool).toBe('HAND')
  canvas.assertNoErrors()
})

test('active tool gets visual highlight', async () => {
  await page.locator('[data-test-id="toolbar-tool-select"]').click()
  await canvas.waitForRender()

  const selectBtn = page.locator('[data-test-id="toolbar-tool-select"]')
  await expect(selectBtn).toHaveAttribute('data-active', 'true')
  canvas.assertNoErrors()
})
