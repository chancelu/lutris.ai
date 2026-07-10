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

function stepper() {
  return page.locator('[data-test-id="pipeline-phase-stepper"]')
}

function phaseButton(label: string) {
  return stepper().locator('button', { hasText: label })
}

function advancePhase(phase: string, output: Record<string, unknown>) {
  return page.evaluate(
    ([p, o]) => window.__OPEN_PENCIL_PIPELINE__!.advancePhase(p, o),
    [phase, output] as const
  )
}

function getCurrentPhase() {
  return page.evaluate(() => window.__OPEN_PENCIL_PIPELINE__!.currentPhase)
}

function getPhases() {
  return page.evaluate(() => window.__OPEN_PENCIL_PIPELINE__!.phases)
}

test('stepper starts at idea phase with later phases not clickable', async () => {
  expect(await getCurrentPhase()).toBe('idea')

  await expect(phaseButton('Idea')).toBeVisible()
  await expect(phaseButton('Spec')).toBeDisabled()
  await expect(phaseButton('Design')).toBeDisabled()
  await expect(phaseButton('Dev')).toBeDisabled()
  canvas.assertNoErrors()
})

test('invalid idea output is rejected and phase does not advance', async () => {
  const result = await advancePhase('idea', { summary: '', targetUsers: '', problem: '' })
  expect(result.valid).toBe(false)
  expect(await getCurrentPhase()).toBe('idea')
  canvas.assertNoErrors()
})

test('valid idea output advances to spec phase', async () => {
  const result = await advancePhase('idea', {
    summary: 'A design tool',
    targetUsers: 'Product designers',
    problem: 'Design and dev are disconnected',
    keyDecisions: [],
  })
  expect(result.valid).toBe(true)
  expect(await getCurrentPhase()).toBe('spec')

  const phases = await getPhases()
  expect(phases.idea.status).toBe('completed')
  expect(phases.spec.status).toBe('in-progress')

  await expect(phaseButton('Spec')).toBeEnabled()
  await expect(phaseButton('Idea').locator('svg')).toBeVisible() // completed check icon
  canvas.assertNoErrors()
})

test('valid spec output advances to design phase', async () => {
  const result = await advancePhase('spec', { specDocumentId: 'doc-1' })
  expect(result.valid).toBe(true)
  expect(await getCurrentPhase()).toBe('design')

  const phases = await getPhases()
  expect(phases.spec.status).toBe('completed')
  expect(phases.design.status).toBe('in-progress')

  await expect(phaseButton('Design')).toBeEnabled()
  canvas.assertNoErrors()
})

test('valid design output advances to dev phase', async () => {
  const result = await advancePhase('design', {
    pageNodeMap: { 'page-1': 'node-1' },
    renderedAt: Date.now(),
  })
  expect(result.valid).toBe(true)
  expect(await getCurrentPhase()).toBe('dev')

  const phases = await getPhases()
  expect(phases.design.status).toBe('completed')
  expect(phases.dev.status).toBe('in-progress')

  await expect(phaseButton('Dev')).toBeEnabled()
  canvas.assertNoErrors()
})

test('valid dev output completes dev phase and stays at dev (last phase)', async () => {
  const result = await advancePhase('dev', { frameworks: ['react'], exportedAt: Date.now() })
  expect(result.valid).toBe(true)
  expect(await getCurrentPhase()).toBe('dev')

  const phases = await getPhases()
  expect(phases.dev.status).toBe('completed')
  canvas.assertNoErrors()
})

test('clicking idea in stepper jumps back to idea phase', async () => {
  await phaseButton('Idea').click()
  await canvas.waitForRender()

  expect(await getCurrentPhase()).toBe('idea')
  await expect(phaseButton('Idea')).toHaveClass(/bg-accent\/15/)
  canvas.assertNoErrors()
})
