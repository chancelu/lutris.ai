import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock localStorage
const storage = new Map<string, string>()
const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => 'test-uuid-1234' },
})

// Mock import.meta.env
vi.stubGlobal('import', { meta: { env: { VITE_FIGMA_CLIENT_ID: 'test-client', VITE_FIGMA_REDIRECT_URI: 'http://localhost/callback' } } })

// Mock fetch
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

describe('useFigmaAuth', () => {
  beforeEach(() => {
    storage.clear()
    vi.clearAllMocks()
  })

  it('getToken returns null when no auth stored', async () => {
    const { useFigmaAuth } = await import('@/composables/use-figma-auth')
    const { getToken } = useFigmaAuth()
    expect(await getToken()).toBeNull()
  })

  it('handleCallback throws on state mismatch', async () => {
    const { useFigmaAuth } = await import('@/composables/use-figma-auth')
    const { handleCallback } = useFigmaAuth()
    await expect(handleCallback('code', 'wrong-state')).rejects.toThrow('Invalid OAuth state')
  })

  it('handleCallback stores tokens on success', async () => {
    storage.set('figma_oauth_state', JSON.stringify({ state: 'valid-state', createdAt: Date.now() }))
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ access_token: 'tok123', refresh_token: 'ref456', expires_in: 7200 }),
    })

    const { useFigmaAuth } = await import('@/composables/use-figma-auth')
    const { handleCallback, isConnected } = useFigmaAuth()
    await handleCallback('auth-code', 'valid-state')

    expect(fetchMock).toHaveBeenCalledWith('/api/figma-oauth', expect.objectContaining({ method: 'POST' }))
    const stored = JSON.parse(storage.get('figma_auth')!)
    expect(stored.accessToken).toBe('tok123')
    expect(stored.refreshToken).toBe('ref456')
  })
})
