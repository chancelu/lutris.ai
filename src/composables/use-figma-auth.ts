import { ref, computed } from 'vue'

const STORAGE_KEY = 'figma_auth'

interface StoredAuth {
  accessToken: string
  expiresAt: number
}

function loadStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAuth
    if (parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const auth = ref<StoredAuth | null>(loadStored())

export function useFigmaAuth() {
  const isConnected = computed(() => {
    const a = auth.value
    return !!a && a.expiresAt > Date.now()
  })

  function getToken(): string | null {
    const a = auth.value
    if (!a || a.expiresAt <= Date.now()) {
      auth.value = null
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return a.accessToken
  }

  function startOAuth() {
    const clientId = import.meta.env.VITE_FIGMA_CLIENT_ID
    const redirectUri = import.meta.env.VITE_FIGMA_REDIRECT_URI
    if (!clientId || !redirectUri) {
      throw new Error('Figma OAuth not configured (VITE_FIGMA_CLIENT_ID / VITE_FIGMA_REDIRECT_URI)')
    }
    const state = crypto.randomUUID()
    sessionStorage.setItem('figma_oauth_state', state)
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'files:read',
      state,
      response_type: 'code',
    })
    window.location.href = `https://www.figma.com/oauth?${params}`
  }

  async function handleCallback(code: string, state: string): Promise<void> {
    const expected = sessionStorage.getItem('figma_oauth_state')
    sessionStorage.removeItem('figma_oauth_state')
    if (!expected || state !== expected) {
      throw new Error('Invalid OAuth state — possible CSRF')
    }

    const res = await fetch('/api/figma-oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(err.error || 'Token exchange failed')
    }
    const data = (await res.json()) as { access_token: string; expires_in: number }
    const stored: StoredAuth = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    auth.value = stored
  }

  function disconnect() {
    auth.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return { isConnected, getToken, startOAuth, handleCallback, disconnect }
}
