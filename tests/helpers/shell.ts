/**
 * Slice E / E3 — shared helpers for the R10 shell (left rail, welcome overlay,
 * pipeline gating).
 *
 * The R10 shell gates canvas chrome (toolbar, left rail) behind the
 * design/dev phases and shows a welcome overlay on an empty canvas in the
 * idea phase. Canvas-interactive specs should call
 * `dismissWelcomeAndEnterDesign` in beforeAll; specs that need the layers or
 * design panel should then call `expandLeftRail`.
 */
import type { Page } from '@playwright/test'

/** Click "Start from a blank canvas" if the welcome overlay is up (idea
 *  phase). No-op when the overlay is absent (e.g. canvas already has content
 *  or the phase already advanced). Returns the current pipeline phase. */
export async function dismissWelcomeAndEnterDesign(page: Page): Promise<string> {
  const overlay = page.locator('[data-test-id="welcome-overlay"]')
  if (await overlay.isVisible().catch(() => false)) {
    await page.locator('[data-test-id="welcome-blank-canvas"]').click()
    await overlay.waitFor({ state: 'hidden', timeout: 5000 })
  }
  return page.evaluate(() => window.__OPEN_PENCIL_PIPELINE__?.currentPhase ?? 'unknown')
}

/** Expand the 48px left rail into the 280px sidebar on the given section,
 *  or switch the active section when the sidebar is already expanded. */
export async function expandLeftRail(page: Page, section: 'layers' | 'design') {
  const rail = page.locator('[data-test-id="left-rail"]')
  if (await rail.isVisible().catch(() => false)) {
    await page.locator(`[data-test-id="left-rail-${section}"]`).click()
  } else {
    await page.locator(`[data-test-id="left-sidebar-${section}-tab"]`).click()
  }
  await page.locator('[data-test-id="left-sidebar"]').waitFor({ state: 'visible', timeout: 5000 })
}

/** Trigger a code export through the same listener seam the export_code tool
 *  uses (core stays store-free; src/stores/code-output listens via
 *  onCodeExport). Vite dev serves the same module instance the app bundled,
 *  so notifyCodeExport reaches the store. */
export function notifyCodeExport(
  page: Page,
  result: { format: 'vue-sfc' | 'react' | 'html'; code: string; nodeCount?: number }
) {
  return page.evaluate(async (r) => {
    const mod = await import('/packages/core/src/tools/export-code.ts')
    mod.notifyCodeExport({ format: r.format, code: r.code, nodeCount: r.nodeCount ?? 1 })
  }, result)
}
