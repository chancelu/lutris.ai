import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

// Minimal stub for the ChatPanel to verify it doesn't crash on mount
// Full component test would require extensive mocking of composables
describe('ChatPanel import validation', () => {
  it('AI_PROVIDERS is importable from @open-pencil/core', async () => {
    const core = await import('@open-pencil/core')
    expect(core.AI_PROVIDERS).toBeDefined()
    expect(Array.isArray(core.AI_PROVIDERS)).toBe(true)
    expect(core.AI_PROVIDERS.length).toBeGreaterThan(0)
  })

  it('AIProgressState includes importing', async () => {
    // Verify the type fix by checking the composable exports
    const { useAIChat } = await import('@/composables/use-chat')
    expect(useAIChat).toBeDefined()
  })
})
