import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'
import { dismissWelcomeAndEnterDesign, notifyCodeExport } from '../helpers/shell'

// Slice E / E3: the R10 CodePanel is store-driven (src/stores/code-output
// listens to core's export_code notifications). These tests drive the same
// seam the tool uses — see tests/helpers/shell.ts notifyCodeExport.

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/editor')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await dismissWelcomeAndEnterDesign(page)
  // Code view is dev-phase only; advance design → dev with a valid output.
  const result = await page.evaluate(() =>
    window.__OPEN_PENCIL_PIPELINE__!.advancePhase('design', {
      pageNodeMap: { 'page-1': 'node-1' },
      renderedAt: Date.now(),
    })
  )
  expect(result.valid).toBe(true)
})

test.afterAll(async () => {
  await page.close()
})

test('entering dev auto-opens the Code view with the otter empty state', async () => {
  const empty = page.locator('[data-test-id="code-panel-empty"]')
  await expect(empty).toBeVisible()
  await expect(empty.locator('img[src="/mascot-designing.png"]')).toBeVisible()
  await expect(empty).toContainText('Ask the AI to export your code.')
  canvas.assertNoErrors()
})

test('a code export shows the panel with framework tab, copy and download', async () => {
  await notifyCodeExport(page, { format: 'vue-sfc', code: '<template><div /></template>' })

  await expect(page.locator('[data-test-id="code-panel"]')).toBeVisible()
  await expect(page.locator('[data-test-id="code-panel-framework-vue"]')).toBeVisible()
  await expect(page.locator('[data-test-id="code-panel-copy"]')).toBeVisible()
  await expect(page.locator('[data-test-id="code-panel-download"]')).toBeVisible()
  await expect(page.locator('[data-test-id="code-panel"]')).toContainText('Component.vue')
  canvas.assertNoErrors()
})

test('exports in other frameworks add per-framework tabs', async () => {
  await notifyCodeExport(page, { format: 'react', code: 'export default function C() { return null }' })
  await notifyCodeExport(page, { format: 'html', code: '<html><body>hi</body></html>' })

  await expect(page.locator('[data-test-id="code-panel-framework-vue"]')).toBeVisible()
  await expect(page.locator('[data-test-id="code-panel-framework-react"]')).toBeVisible()
  await expect(page.locator('[data-test-id="code-panel-framework-html"]')).toBeVisible()

  // Latest export (HTML) is the active payload.
  await expect(page.locator('[data-test-id="code-panel"]')).toContainText('index.html')

  // Switching back to the React tab shows the cached React payload.
  await page.locator('[data-test-id="code-panel-framework-react"]').click()
  await expect(page.locator('[data-test-id="code-panel"]')).toContainText('Component.tsx')
  await expect(page.locator('[data-test-id="code-panel"]')).toContainText('export default function C')
  canvas.assertNoErrors()
})

test('copy button shows confirmation', async () => {
  await page.locator('[data-test-id="code-panel-copy"]').click()
  await expect(page.locator('[data-test-id="code-panel-copy"]')).toContainText('Copied')
  canvas.assertNoErrors()
})
