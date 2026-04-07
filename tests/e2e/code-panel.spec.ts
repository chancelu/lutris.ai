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

// CodePanel is not currently mounted in the editor layout.
// These tests are skipped until CodePanel is re-integrated.
test.skip('Code tab shows empty state with no selection', async () => {})
test.skip('selecting a rectangle shows JSX code', async () => {})
test.skip('format toggle switches between OpenPencil and Tailwind', async () => {})
test.skip('copy button works and shows confirmation', async () => {})
test.skip('deselecting shows empty state again', async () => {})
test.skip('selecting a frame shows Frame in JSX', async () => {})
test.skip('switching back to Design tab works', async () => {})
