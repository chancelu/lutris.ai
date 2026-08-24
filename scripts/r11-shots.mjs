// R11 visual verification — drives the shell through all four phases in dark
// + light and screenshots each key surface. Run: node scripts/r11-shots.mjs
// (requires dev server on :1420).
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = 'C:/Users/admin/Documents/kimi/workspace/r11-acceptance'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

const shot = (name) => page.screenshot({ path: `${out}/${name}.png` })
const settle = (ms = 700) => page.waitForTimeout(ms)

// ── 1. Idea phase: welcome overlay (dark, default) ──
await page.goto('http://localhost:1420/editor')
await page.locator('canvas[data-ready="1"]').waitFor({ timeout: 30000 })
await page.locator('[data-test-id="canvas-loading"]').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {})
await settle(1000)
await shot('01-dark-idea-welcome')

// ── 2. Provider setup (right panel, no key) ──
await shot('02-dark-provider-setup')

// ── 3. Design phase: blank canvas skip → chrome appears ──
await page.locator('[data-test-id="welcome-blank-canvas"]').click()
await settle(900)
await shot('03-dark-design-empty')

// ── 4. Left rail expanded (layers) ──
await page.locator('[data-test-id="tool-dock-layers"]').click()
await settle(500)
await shot('04-dark-left-sidebar')

// ── 5. Spec view with a page ──
await page.locator('[data-test-id="panel-view-spec"]').click()
await settle(400)
const addPage = page.locator('text=Add Page')
if (await addPage.isVisible().catch(() => false)) {
  await addPage.click()
  await settle(400)
}
await shot('05-dark-spec-view')

// ── 6. Back to chat; advance to dev → code view auto-opens ──
await page.evaluate(() =>
  window.__OPEN_PENCIL_PIPELINE__.advancePhase('design', {
    pageNodeMap: { 'page-1': 'node-1' },
    renderedAt: Date.now()
  })
)
await settle(700)
await page.evaluate(async () => {
  const mod = await import('/packages/core/src/tools/export-code.ts')
  mod.notifyCodeExport({
    format: 'react',
    code: 'export default function Board() {\n  return (\n    <section className="flex flex-col gap-4 p-6">\n      <h1 className="text-2xl font-semibold">Morning routine</h1>\n      <p className="text-sm text-neutral-500">Shared family habits</p>\n    </section>\n  )\n}',
    nodeCount: 3
  })
  mod.notifyCodeExport({ format: 'vue-sfc', code: '<template>\n  <section class="board">\n    <h1>Morning routine</h1>\n  </section>\n</template>', nodeCount: 3 })
})
await settle(700)
await shot('06-dark-dev-code')

// ── 7. Next-step card visible in chat (phase-complete moment) ──
await page.locator('[data-test-id="panel-view-chat"]').click()
await settle(500)
await shot('07-dark-chat-next-step')

// ── 8. Light theme: design phase ──
await page.locator('[data-test-id="topbar-settings"]').click()
await settle(300)
await shot('08-dark-settings-menu')
await page.locator('[data-test-id="topbar-settings-theme"]').click()
await settle(600)
await shot('09-light-dev-code')

// ── 9. Light: back to idea welcome via phase jump not possible; reload ──
await page.goto('http://localhost:1420/editor?fresh=1')
await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('lutris-projects') }).catch(() => {})
await page.goto('http://localhost:1420/editor')
await page.locator('canvas[data-ready="1"]').waitFor({ timeout: 30000 })
await page.locator('[data-test-id="canvas-loading"]').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {})
await settle(900)
await shot('10-light-idea-welcome')

console.log('errors:', errors.length ? errors : 'none')
await browser.close()
