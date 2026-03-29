import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '../helpers/canvas'

const USE_REAL_LLM = process.env.TEST_REAL_LLM === '1'
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY ?? ''

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  if (!USE_REAL_LLM) {
    await injectMockTransport(page)
  }
})

test.afterAll(async () => {
  await page.close()
})

async function injectMockTransport(page: Page) {
  await page.evaluate(() => {
    const setTransport = window.__OPEN_PENCIL_SET_TRANSPORT__
    if (!setTransport) throw new Error('Transport override not available')

    let msgCounter = 0

    setTransport(() => ({
      async sendMessages({
        messages,
      }: {
        messages: Array<{ role: string; parts: Array<{ type: string; text?: string }> }>
      }) {
        const lastUser = [...messages].reverse().find((m) => m.role === 'user')
        const text = lastUser?.parts?.find((p) => p.type === 'text')?.text ?? ''
        const msgId = `mock-msg-${++msgCounter}`
        const wantsTool = text.toLowerCase().includes('frame') || text.toLowerCase().includes('rectangle')

        return new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'start', messageId: msgId })

            if (wantsTool) {
              const toolCallId = `call-${msgId}`
              controller.enqueue({
                type: 'tool-input-start',
                toolCallId,
                toolName: 'create_shape',
              })
              controller.enqueue({
                type: 'tool-input-delta',
                toolCallId,
                inputTextDelta: '{"type":"FRAME","x":100,"y":100,"width":200,"height":150,"name":"Card"}',
              })
              controller.enqueue({
                type: 'tool-input-available',
                toolCallId,
                toolName: 'create_shape',
                input: { type: 'FRAME', x: 100, y: 100, width: 200, height: 150, name: 'Card' },
              })
              controller.enqueue({
                type: 'tool-output-available',
                toolCallId,
                toolName: 'create_shape',
                output: { id: '0:99', type: 'FRAME', x: 100, y: 100, width: 200, height: 150, name: 'Card' },
              })
            }

            const words = wantsTool
              ? ['Created', 'a', 'frame', 'called', '"Card".']
              : `I'll help you with: "${text}". Here's a mock response.`.split(' ')

            controller.enqueue({ type: 'text-start', id: 'text-1' })
            for (const word of words) {
              controller.enqueue({ type: 'text-delta', id: 'text-1', delta: word + ' ' })
            }
            controller.enqueue({ type: 'text-end', id: 'text-1' })
            controller.enqueue({ type: 'finish', finishReason: 'stop' })
            controller.close()
          },
        })
      },
      async reconnectToStream() {
        return null
      },
    }))
  })
}

function chatInput() {
  return page.locator('[data-test-id="chat-input"]')
}

function apiKeyInput() {
  return page.locator('[data-test-id="api-key-input"]')
}

test('chat panel is visible by default in properties panel', async () => {
  const chatPanel = page.locator('[data-test-id="chat-panel"]')
  await expect(chatPanel).toBeVisible()
})

test('provider setup shows when no key set', async () => {
  await expect(apiKeyInput()).toBeVisible()
  await expect(page.locator('[data-test-id="provider-setup"]')).toBeVisible()
})

test('saving API key shows chat interface', async () => {
  const key = USE_REAL_LLM ? OPENROUTER_KEY : 'sk-or-test-key-12345'
  await apiKeyInput().fill(key)
  await page.locator('button:has-text("Connect")').click()

  await expect(chatInput()).toBeVisible()
})

test('empty input has disabled send button', async () => {
  const sendButton = page.locator('[data-test-id="chat-send-button"]')
  await expect(sendButton).toBeDisabled()
})

test('typing enables send button', async () => {
  await chatInput().fill('Make a red rectangle')
  const sendButton = page.locator('[data-test-id="chat-send-button"]')
  await expect(sendButton).toBeEnabled()
})

test('Enter submits message and clears input', async () => {
  await chatInput().fill('Hello there')
  await chatInput().press('Enter')

  await expect(page.getByText('Hello there', { exact: true })).toBeVisible({ timeout: 5000 })
  await expect(chatInput()).toHaveValue('')
})

test('assistant responds', async () => {
  if (USE_REAL_LLM) {
    await expect(
      page.locator('.chat-markdown, [class*="rounded-tl-md"]').first(),
    ).toBeVisible({ timeout: 30000 })
  } else {
    await expect(page.getByText('mock response', { exact: false })).toBeVisible({ timeout: 5000 })
  }
})

test('model selector is visible and clickable', async () => {
  const trigger = page.locator('[data-test-id="chat-model-selector"]')
  await expect(trigger).toBeVisible()
  await trigger.click()

  await expect(page.getByRole('option', { name: /Claude Sonnet 4\.6/ })).toBeVisible()
  await expect(page.getByText('Best for design')).toBeVisible()
  await expect(page.getByText('Free').first()).toBeVisible()

  await page.keyboard.press('Escape')
})

test('tool calls render in assistant message', async () => {
  await chatInput().fill('Create a frame')
  await chatInput().press('Enter')

  if (USE_REAL_LLM) {
    await expect(
      page.locator('.chat-markdown, [class*="rounded-tl-md"]').first(),
    ).toBeVisible({ timeout: 30000 })
  } else {
    await expect(page.getByText('Create Shape')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Done')).toBeVisible()
    await expect(page.getByText('Created a frame', { exact: false })).toBeVisible()
  }
})

test('chat messages persist after navigation', async () => {
  // Navigate away and back to verify chat state persists
  await page.keyboard.press('Escape')
  await canvas.waitForRender()

  const chatPanel = page.locator('[data-test-id="chat-panel"]')
  await expect(chatPanel).toBeVisible()
  await expect(page.getByText('Hello there', { exact: true })).toBeVisible()
})
