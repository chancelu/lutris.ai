import { ref, computed } from 'vue'

const STORAGE_KEY = 'figma_auth'
const OAUTH_STATE_KEY = 'figma_oauth_state'
const REFRESH_MARGIN_MS = 5 * 60 * 1000
const STATE_TTL_MS = 5 * 60 * 1000

interface StoredAuth {
  accessToken: string
  refreshToken: string | null
  expiresAt: number
}

function loadStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAuth
    if (parsed.expiresAt <= Date.now() && !parsed.refreshToken) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function saveAuth(stored: StoredAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  auth.value = stored
}

const auth = ref<StoredAuth | null>(loadStored())
let refreshPromise: Promise<string | null> | null = null

export function useFigmaAuth() {
  const isConnected = computed(() => {
    const a = auth.value
    return !!a && (a.expiresAt > Date.now() || !!a.refreshToken)
  })

  async function refreshAccessToken(): Promise<string | null> {
    const a = auth.value
    if (!a?.refreshToken) return null
    const originalRefreshToken = a.refreshToken

    const res = await fetch('/api/figma-refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: a.refreshToken }),
    })
    if (!res.ok) {
      if (auth.value?.refreshToken === originalRefreshToken) {
        auth.value = null
        localStorage.removeItem(STORAGE_KEY)
      }
      return null
    }
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number }
    if (!data.access_token || !data.expires_in) return null
    if (auth.value?.refreshToken !== originalRefreshToken) {
      return auth.value?.accessToken ?? null
    }
    const stored: StoredAuth = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? a.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
    saveAuth(stored)
    return stored.accessToken
  }

  async function getToken(): Promise<string | null> {
    const a = auth.value
    if (!a) return null
    if (a.expiresAt > Date.now() + REFRESH_MARGIN_MS) return a.accessToken
    if (a.refreshToken) {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null })
      }
      return refreshPromise
    }
    auth.value = null
    localStorage.removeItem(STORAGE_KEY)
    return null
  }

  function startOAuth() {
    const clientId = import.meta.env.VITE_FIGMA_CLIENT_ID
    const redirectUri = import.meta.env.VITE_FIGMA_REDIRECT_URI
    if (!clientId || !redirectUri) {
      throw new Error('Figma OAuth not configured (VITE_FIGMA_CLIENT_ID / VITE_FIGMA_REDIRECT_URI)')
    }
    const state = crypto.randomUUID()
    const stateEntry = JSON.stringify({ state, createdAt: Date.now() })
    localStorage.setItem(OAUTH_STATE_KEY, stateEntry)
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
    const raw = localStorage.getItem(OAUTH_STATE_KEY)
    localStorage.removeItem(OAUTH_STATE_KEY)
    if (!raw) throw new Error('Invalid OAuth state — possible CSRF')
    const entry = JSON.parse(raw) as { state: string; createdAt: number }
    if (entry.state !== state || Date.now() - entry.createdAt > STATE_TTL_MS) {
      throw new Error('Invalid or expired OAuth state')
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
    const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number }
    saveAuth({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: Date.now() + data.expires_in * 1000,
    })
  }

  function disconnect() {
    auth.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  return { isConnected, getToken, startOAuth, handleCallback, disconnect }
}