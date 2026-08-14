// R11 supplemental shots — keyless ProviderSetup + spec/code in keyless env.
// Requires the playwright-managed dev server on :1420 (keyless VITE_AI_* env).
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
await page.waitForTimeout(900)

// ProviderSetup (keyless) in the chat panel
await page.screenshot({ path: `${out}/11-dark-provider-setup-keyless.png` })

// Provider settings popover (gear in chat input area)
const trigger = page.locator('[data-test-id="provider-settings-trigger"]')
if (await trigger.isVisible().catch(() => false)) {
  await trigger.click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/12-dark-provider-settings.png` })
}

console.log('errors:', errors.length ? errors : 'none')
await browser.close()
