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
  // R12 "Atelier" welcome: serif Chinese headline, no mascot.
  await expect(overlay).toContainText('从一个想法')
  await expect(page.locator('[data-test-id="welcome-describe-idea"]')).toBeVisible()
  await expect(page.locator('[data-test-id="welcome-blank-canvas"]')).toBeVisible()
  expect(await getPhase()).toBe('idea')
  canvas.assertNoErrors()
})

test('2. blank-canvas skip lands in design with toolbar and a bottom-center dock', async () => {
  await page.locator('[data-test-id="welcome-blank-canvas"]').click()
  await expect(page.locator('[data-test-id="welcome-overlay"]')).not.toBeVisible()

  expect(await getPhase()).toBe('design')
  await expect(page.locator('[data-test-id="toolbar"]')).toBeVisible()

  const dock = page.locator('[data-test-id="tool-dock"]')
  await expect(dock).toBeVisible()
  const box = await dock.boundingBox()
  expect(box).not.toBeNull()
  // R15: 横向 dock——矮条（高度一按钮），宽度大于高度
  expect(box!.height).toBeLessThanOrEqual(56)
  expect(box!.width).toBeGreaterThan(box!.height)
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

test('5. advancing to dev keeps the chat and lights the Code tab dot', async () => {
  const result = await page.evaluate(() =>
    window.__OPEN_PENCIL_PIPELINE__!.advancePhase('design', {
      pageNodeMap: { 'page-1': 'node-1' },
      renderedAt: Date.now(),
    })
  )
  expect(result.valid).toBe(true)
  expect(await getPhase()).toBe('dev')

  // R12: entering dev no longer rips the user out of the chat — the Code tab
  // gets a notification dot instead, and the user opens it explicitly.
  await expect(page.locator('[data-test-id="chat-panel"]')).toBeVisible()
  await expect(page.locator('[data-test-id="panel-view-code-dot"]')).toBeVisible()

  await page.locator('[data-test-id="panel-view-code"]').click()
  const empty = page.locator('[data-test-id="code-panel-empty"]')
  await expect(empty).toBeVisible()
  await expect(empty.locator('svg[aria-label="Lutris otter"]')).toBeVisible()
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

// ── P1: zero-AI user-driven path through design → dev ──
// Covers the three new user-side actions: blank-canvas skip, the TopBar
// "完成设计 →" advance (no AI submit needed), and the Code panel's
// no-AI direct export. The whole flow runs without any provider key.
test('9. zero-AI path: skip → design → finish design → direct code export', async ({
  browser,
}) => {
  const p = await browser.newPage()
  const errors: string[] = []
  p.on('pageerror', (err) => errors.push(err.message))
  await p.goto('/editor')
  await p.locator('canvas[data-ready="1"]').waitFor({ timeout: 30_000 })

  // Idea → Design via the no-key escape hatch
  await p.locator('[data-test-id="welcome-blank-canvas"]').click()
  await expect(p.locator('[data-test-id="welcome-overlay"]')).not.toBeVisible()
  expect(await p.evaluate(() => window.__OPEN_PENCIL_PIPELINE__!.currentPhase)).toBe('design')

  // Put a page frame on the canvas (stands in for AI-rendered design)
  await p.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    const id = store.createShape('FRAME', 100, 100, 375, 812)
    store.renameNode(id, '首页')
  })

  // User-side advance: 完成设计 → (TopBar primary button, design phase only)
  const finish = p.locator('[data-test-id="topbar-finish-design"]')
  await expect(finish).toBeVisible()
  await finish.click()
  expect(await p.evaluate(() => window.__OPEN_PENCIL_PIPELINE__!.currentPhase)).toBe('dev')
  await expect(finish).not.toBeVisible() // button only exists in design phase

  // Dev: open the Code view and export without any AI round-trip
  await p.locator('[data-test-id="panel-view-code"]').click()
  const empty = p.locator('[data-test-id="code-panel-empty"]')
  await expect(empty).toBeVisible()
  await p.locator('[data-test-id="code-panel-direct-export"]').click()

  await expect(p.locator('[data-test-id="code-panel"]')).toBeVisible()
  await expect(p.locator('[data-test-id="code-panel-framework-vue"]')).toBeVisible()
  await expect(p.locator('[data-test-id="code-panel-framework-react"]')).toBeVisible()

  expect(errors).toEqual([])
  await p.close()
})

// ── P1: 交付物是可运行的工程 zip，不只是代码片段 ──
test('10. code panel downloads a runnable project zip', async ({ browser }) => {
  const p = await browser.newPage()
  const errors: string[] = []
  p.on('pageerror', (err) => errors.push(err.message))
  await p.goto('/editor')
  await p.locator('canvas[data-ready="1"]').waitFor({ timeout: 30_000 })

  await p.locator('[data-test-id="welcome-blank-canvas"]').click()
  await p.evaluate(() => {
    const store = window.__OPEN_PENCIL_STORE__!
    const id = store.createShape('FRAME', 100, 100, 375, 812)
    store.renameNode(id, '首页')
    store.createShape('TEXT', 20, 20, 200, 40, id)
  })

  // 无 AI 直出 → 默认落在最新导出的框架上
  await p.locator('[data-test-id="topbar-finish-design"]').click()
  await p.locator('[data-test-id="panel-view-code"]').click()
  await p.locator('[data-test-id="code-panel-direct-export"]').click()
  await expect(p.locator('[data-test-id="code-panel"]')).toBeVisible()

  // React tab 上点击 Project → 应下载 zip 且可解压出完整 Vite 工程
  await p.locator('[data-test-id="code-panel-framework-react"]').click()
  const [download] = await Promise.all([
    p.waitForEvent('download'),
    p.locator('[data-test-id="code-panel-download-project"]').click(),
  ])
  expect(download.suggestedFilename()).toBe('lutris-react-app.zip')

  const zipPath = await download.path()
  const { unzipSync, strFromU8 } = await import('fflate')
  const { readFileSync } = await import('node:fs')
  const entries = unzipSync(new Uint8Array(readFileSync(zipPath!)))
  expect(Object.keys(entries)).toEqual(
    expect.arrayContaining(['package.json', 'src/main.tsx', 'src/Component.tsx', 'src/styles.css'])
  )
  const pkg = JSON.parse(strFromU8(entries['package.json']))
  expect(pkg.scripts.dev).toBe('vite')
  // 内嵌 CSS 注释块已被拆成真实文件，tsx 里不留残骸
  expect(strFromU8(entries['src/Component.tsx'])).not.toContain('/* styles.css */')
  expect(strFromU8(entries['src/styles.css'])).toContain('{')

  // 埋点漏斗：这条零 AI 路径应完整留下事件轨迹
  const events: string[] = await p.evaluate(() =>
    (window as any).__LUTRIS_ANALYTICS__.events.map((e: any) => e.event)
  )
  for (const expected of [
    'welcome_action', // blank-canvas
    'phase_skipped', // idea/spec → design
    'finish_design_clicked',
    'phase_advanced', // design → dev
    'direct_export',
    'code_exported',
    'code_download', // kind: project
  ]) {
    expect(events, `missing event ${expected}`).toContain(expected)
  }

  expect(errors).toEqual([])
  await p.close()
})
