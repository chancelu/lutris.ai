import { test, expect, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'
import { getSelectedNode, getNodeById } from '../helpers/store'

let page: Page
let canvas: CanvasHelper
let frameId: string

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/editor')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.clearCanvas()
})

test.afterAll(async () => {
  await page.close()
})

async function selectFrame() {
  expect(frameId, 'frameId must be set — did the Shift+A test run?').toBeTruthy()
  await page.evaluate((id: string) => {
    window.__OPEN_PENCIL_STORE__!.select([id])
  }, frameId)
  await canvas.waitForRender()
}

test('Shift+A wraps selection in auto-layout frame', async () => {
  await canvas.clearCanvas()
  await canvas.drawRect(100, 100, 60, 60)
  await canvas.drawRect(220, 100, 60, 60)
  await canvas.pressKey('Meta+a')
  await canvas.waitForRender()

  await canvas.pressKey('Shift+A')
  await canvas.waitForRender()

  const node = await getSelectedNode(page)
  expect(node).not.toBeNull()
  expect(node!.type).toBe('FRAME')
  expect(node!.layoutMode).not.toBe('NONE')
  expect(node!.childIds.length).toBe(2)

  frameId = node!.id
  canvas.assertNoErrors()
})

// LayoutSection is not currently mounted in the DesignPanel.
// These tests are skipped until LayoutSection is re-integrated.
test.skip('direction button toggles to VERTICAL', async () => {})
test.skip('gap ScrubInput sets itemSpacing', async () => {})
test.skip('uniform padding ScrubInput sets all four padding sides', async () => {})
test.skip('alignment grid center sets CENTER alignment', async () => {})
test.skip('remove auto-layout sets layoutMode to NONE', async () => {})
