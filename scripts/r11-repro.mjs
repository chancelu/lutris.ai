// Reproduce user-reported errors: landing page gone + structuredClone error.
import { chromium } from '@playwright/test'

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('Failed to load resource')) {
    errors.push(`CONSOLE: ${m.text().slice(0, 300)}`)
  }
})

// 1. Landing page
await page.goto('http://localhost:1420/')
await page.waitForTimeout(2500)
const landingText = await page.evaluate(() => document.body.innerText.slice(0, 200).replace(/\n+/g, ' | '))
console.log('LANDING TEXT:', landingText || '(EMPTY)')
await page.screenshot({ path: 'C:/Users/admin/Documents/kimi/workspace/r11-acceptance/20-repro-landing.png' })

// 2. Editor
await page.goto('http://localhost:1420/editor')
await page.locator('canvas[data-ready="1"]').waitFor({ timeout: 30000 }).catch(() => {})
await page.waitForTimeout(2500)
await page.screenshot({ path: 'C:/Users/admin/Documents/kimi/workspace/r11-acceptance/21-repro-editor.png' })

console.log('ERRORS:', errors.length ? errors.join('\n') : 'none')
await browser.close()
