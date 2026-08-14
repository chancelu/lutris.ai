// R11 live chat visual check — one real AI turn to verify bubble/typography
// styles with real content. Requires dev server on :1420 with a configured
// provider (.env.local). Writes to workspace/r11-acceptance.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = 'C:/Users/admin/Documents/kimi/workspace/r11-acceptance'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto('http://localhost:1420/editor')
await page.locator('canvas[data-ready="1"]').waitFor({ timeout: 30000 })
await page.locator('[data-test-id="canvas-loading"]').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {})
await page.waitForTimeout(800)

const input = page.locator('[data-test-id="chat-input"]')
if (!(await input.isVisible().catch(() => false))) {
  console.log('chat input not visible (no provider configured?) — skipping live turn')
  await browser.close()
  process.exit(0)
}

await input.fill('I want to build a habit tracking app for busy parents with shared family routines')
await input.press('Enter')

// wait for streaming to finish (stop button appears then disappears)
const stopBtn = page.locator('[data-test-id="chat-stop-button"]')
const start = Date.now()
let sawStop = false
while (Date.now() - start < 15000) {
  if (await stopBtn.isVisible().catch(() => false)) { sawStop = true; break }
  await page.waitForTimeout(500)
}
while (Date.now() - start < 120000) {
  const stopping = await stopBtn.isVisible().catch(() => false)
  if (!stopping && (sawStop || Date.now() - start > 20000)) break
  await page.waitForTimeout(1500)
}
await page.waitForTimeout(1500)
await page.screenshot({ path: `${out}/13-dark-live-chat.png` })

console.log('errors:', errors.length ? errors : 'none')
await browser.close()
