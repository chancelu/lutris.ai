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

// Context menu items have no data-test-id attributes in the current UI.
// These tests are skipped until context menu test IDs are added.
test.skip('right-click on empty canvas shows context menu without selection items disabled', async () => {})
test.skip('draw shape and right-click selects it', async () => {})
test.skip('context menu shows expected items', async () => {})
test.skip('duplicate via context menu works', async () => {})
test.skip('toggle visibility via context menu', async () => {})
test.skip('toggle lock via context menu', async () => {})
test.skip('delete via context menu removes node', async () => {})
test.skip('group via context menu', async () => {})
test.skip('ungroup via store after context-menu group', async () => {})
test.skip('create component via context menu', async () => {})
test.skip('Copy/Paste as submenu exists', async () => {})
