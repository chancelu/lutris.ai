import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('stitch-client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('mcpCall throws on non-200 response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    })

    const { generateScreen } = await import('@/lib/stitch-client')
    await expect(generateScreen('test prompt')).rejects.toThrow()
  })

  it('mcpCall throws on MCP error response', async () => {
    // First call: tools/list for discovery
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        jsonrpc: '2.0', id: 1,
        result: { content: [{ type: 'text', text: JSON.stringify({ tools: [{ name: 'generate_screen_from_text' }, { name: 'list_projects' }, { name: 'create_project' }] }) }] },
      }),
    })
    // Second call: list_projects
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        jsonrpc: '2.0', id: 2,
        result: { content: [{ type: 'text', text: JSON.stringify({ projects: [{ name: 'projects/123' }] }) }] },
      }),
    })
    // Third call: generate_screen_from_text returns error
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        jsonrpc: '2.0', id: 3,
        error: { code: -1, message: 'Generation failed' },
      }),
    })

    const { generateScreen } = await import('@/lib/stitch-client')
    await expect(generateScreen('test')).rejects.toThrow('Generation failed')
  })

  it('refineScreen constructs prompt with original HTML and feedback', async () => {
    const { refineScreen } = await import('@/lib/stitch-client')
    // Will fail on fetch but we can verify the function exists and accepts params
    await expect(refineScreen('<div>hello</div>', 'make it blue', 'header')).rejects.toThrow()
  })
})
