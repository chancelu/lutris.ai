import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'
import { expandLeftRail, notifyCodeExport } from '../helpers/shell'

/**
 * Slice E / E4 — the 小白 happy path end to end:
 * welcome → blank-canvas skip → design chrome → select → design panel
 * sections → stepper gating → dev code view → code export → provider setup
 * without keys.
 */

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

function getPhase() {
  return page.evaluate(() => window.__OPEN_PENCIL_PIPELINE__!.currentPhase)
}

test('1. editor loads with zero console errors and shows the welcome overlay', async () => {
  const overlay = page.locator('[data-test-id="welcome-overlay"]')
  await expect(overlay).toBeVisible()
  await expect(overlay.locator('img[src="/lutris-otter.png"]')).toBeVisible()
  await expect(overlay).toContainText('What do you want to build?')
  await expect(page.locator('[data-test-id="welcome-describe-idea"]')).toBeVisible()
  await expect(page.locator('[data-test-id="welcome-blank-canvas"]')).toBeVisible()
  expect(await getPhase()).toBe('idea')
  canvas.assertNoErrors()
})

test('2. blank-canvas skip lands in design with toolbar and a collapsed 48px rail', async () => {
  await page.locator('[data-test-id="welcome-blank-canvas"]').click()
  await expect(page.locator('[data-test-id="welcome-overlay"]')).not.toBeVisible()

  expect(await getPhase()).toBe('design')
  await expect(page.locator('[data-test-id="toolbar"]')).toBeVisible()

  const rail = page.locator('[data-test-id="left-rail"]')
  await expect(rail).toBeVisible()
  const box = await rail.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeLessThanOrEqual(50)
  canvas.assertNoErrors()
})

test('3. expand rail, create + select a rectangle, design panel shows all R10 sections', async () => {
  await expandLeftRail(page, 'layers')
  await expect(page.locator('[data-test-id="layers-panel"]')).toBeVisible()

  await page.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    const id = store.createShape('RECTANGLE', 200, 200, 160, 120)
    store.select([id])
  })
  await canvas.waitForRender()

  await expandLeftRail(page, 'design')
  const panel = page.locator('[data-test-id="design-panel-single"]')
  await expect(panel).toBeVisible()
  for (const label of ['Position', 'Layout', 'Appearance', 'Fill', 'Stroke', 'Effects']) {
    await expect(panel.locator('label', { hasText: label }).first()).toBeVisible()
  }
  canvas.assertNoErrors()
})

test('4. stepper gating: idea ↔ design jumps work, dev stays locked', async () => {
  const jumpTo = (phase: string) =>
    page.evaluate((p) => window.__OPEN_PENCIL_PIPELINE__!.jumpToPhase(p), phase)
  const canJumpTo = (phase: string) =>
    page.evaluate((p) => window.__OPEN_PENCIL_PIPELINE__!.canJumpTo(p), phase)

  expect(await jumpTo('idea')).toBe(true)
  expect(await getPhase()).toBe('idea')
  expect(await jumpTo('design')).toBe(true)
  expect(await getPhase()).toBe('design')

  // Dev was never reached — locked both in the hook and in the stepper UI.
  expect(await canJumpTo('dev')).toBe(false)
  expect(await jumpTo('dev')).toBe(false)
  expect(await getPhase()).toBe('design')

  const stepper = page.locator('[data-test-id="pipeline-phase-stepper"]')
  await expect(stepper.locator('button', { hasText: 'Dev' })).toBeDisabled()
  await expect(stepper.locator('button', { hasText: 'Design' })).toBeEnabled()
  canvas.assertNoErrors()
})

test('5. advancing to dev auto-opens the Code view with the otter empty state', async () => {
  const result = await page.evaluate(() =>
    window.__OPEN_PENCIL_PIPELINE__!.advancePhase('design', {
      pageNodeMap: { 'page-1': 'node-1' },
      renderedAt: Date.now(),
    })
  )
  expect(result.valid).toBe(true)
  expect(await getPhase()).toBe('dev')

  const empty = page.locator('[data-test-id="code-panel-empty"]')
  await expect(empty).toBeVisible()
  await expect(empty.locator('img[src="/lutris-otter.png"]')).toBeVisible()
  canvas.assertNoErrors()
})

test('6. a code export reveals framework tabs, copy and download', async () => {
  await notifyCodeExport(page, { format: 'vue-sfc', code: '<template><div /></template>' })
  await notifyCodeExport(page, { format: 'react', code: 'export default function C() { return null }' })

  await expect(page.locator('[data-test-id="code-panel"]')).toBeVisible()
  await expect(page.locator('[data-test-id="code-panel-framework-vue"]')).toBeVisible()
  await expect(page.locator('[data-test-id="code-panel-framework-react"]')).toBeVisible()
  await expect(page.locator('[data-test-id="code-panel-copy"]')).toBeVisible()
  await expect(page.locator('[data-test-id="code-panel-download"]')).toBeVisible()
  canvas.assertNoErrors()
})

// ── Step 7: ProviderSetup without any keys ──
// The e2e dev server is started with VITE_AI_* stripped (process env wins
// over .env.local), so this profile is genuinely keyless and ProviderSetup
// renders. A second stripped server is not an option: the app's automation
// vite plugin binds hardcoded ports 7600/7601.
test('7. fresh profile without keys shows simplified provider setup with skip link', async ({
  browser,
}) => {
  const keyless = await browser.newPage()
  const errors: string[] = []
  keyless.on('pageerror', (err) => errors.push(err.message))
  await keyless.goto('/editor')
  await keyless.locator('canvas[data-ready="1"]').waitFor({ timeout: 30_000 })

  const setup = keyless.locator('[data-test-id="provider-setup"]')
  await expect(setup).toBeVisible()
  // Single recommended provider preselected (OpenRouter, `recommended: true`).
  await expect(setup).toContainText('OpenRouter')
  await expect(keyless.locator('[data-test-id="api-key-input"]')).toBeVisible()

  // The no-key escape hatch is offered in the idea phase and works.
  const skip = keyless.locator('[data-test-id="skip-to-design"]')
  await expect(skip).toBeVisible()
  expect(await keyless.evaluate(() => window.__OPEN_PENCIL_PIPELINE__!.currentPhase)).toBe('idea')
  await skip.click()
  expect(await keyless.evaluate(() => window.__OPEN_PENCIL_PIPELINE__!.currentPhase)).toBe('design')

  expect(errors).toEqual([])
  await keyless.close()
})
