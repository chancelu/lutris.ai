/**
 * Vercel Serverless MCP Proxy for Google Stitch
 *
 * Accepts: POST { method: 'tools/list' | 'tools/call', params: {...} }
 * Auth priority:
 *   1. STITCH_API_KEY — simplest, passed as query param (known issues with some endpoints)
 *   2. STITCH_ACCESS_TOKEN — pre-generated OAuth2 token
 *   3. GOOGLE_SERVICE_ACCOUNT_JSON — JWT assertion → OAuth2 token
 * Forwards MCP request to https://stitch.googleapis.com/mcp
 */

const STITCH_ENDPOINT = 'https://stitch.googleapis.com/mcp'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

const ALLOWED_ORIGINS = [
  'https://lutris.ai',
  'https://app.lutris.ai',
  'http://localhost:1420',
  'http://localhost:5173',
]

const ALLOWED_METHODS = ['tools/list', 'tools/call', 'initialize']

let cachedToken = null
let tokenExpiresAt = 0
let mcpSessionId = null

export const config = { maxDuration: 30 }

function base64url(data) {
  return Buffer.from(data).toString('base64url')
}

async function signJWT(header, payload, privateKeyPem) {
  const { createSign } = await import('node:crypto')
  const input = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const sign = createSign('RSA-SHA256')
  sign.update(input)
  return `${input}.${sign.sign(privateKeyPem, 'base64url')}`
}

async function getServiceAccountToken(saJson) {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && tokenExpiresAt > now + 60) return cachedToken

  const sa = JSON.parse(saJson)
  const jwt = await signJWT(
    { alg: 'RS256', typ: 'JWT' },
    { iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 },
    sa.private_key,
  )
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown token error')
    throw new Error(`OAuth2 token exchange failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiresAt = now + (data.expires_in || 3600)
  return cachedToken
}

/**
 * Resolve auth: returns { endpoint, headers } based on available credentials.
 */
async function resolveAuth() {
  const apiKey = process.env.STITCH_API_KEY
  const accessToken = process.env.STITCH_ACCESS_TOKEN
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID

  const headers = { 'Content-Type': 'application/json' }
  let endpoint = STITCH_ENDPOINT

  if (apiKey) {
    // API key auth — append as query param
    endpoint = `${STITCH_ENDPOINT}?key=${apiKey}`
    if (projectId) headers['X-Goog-User-Project'] = projectId
  } else if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
    if (projectId) headers['X-Goog-User-Project'] = projectId
  } else if (saJson) {
    const token = await getServiceAccountToken(saJson)
    headers['Authorization'] = `Bearer ${token}`
    if (projectId) headers['X-Goog-User-Project'] = projectId
  } else {
    throw new Error('No Stitch credentials configured. Set STITCH_API_KEY, STITCH_ACCESS_TOKEN, or GOOGLE_SERVICE_ACCOUNT_JSON.')
  }

  return { endpoint, headers }
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { method, params } = req.body || {}
  if (!method || !ALLOWED_METHODS.includes(method)) {
    return res.status(400).json({ error: `Invalid MCP method. Allowed: ${ALLOWED_METHODS.join(', ')}` })
  }

  try {
    const { endpoint, headers: authHeaders } = await resolveAuth()

    // Auto-initialize MCP session if needed
    if (!mcpSessionId && method !== 'initialize') {
      const initPayload = { jsonrpc: '2.0', id: Date.now() - 1, method: 'initialize', params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'lutris-stitch-proxy', version: '1.0.0' },
      }}
      const initRes = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(initPayload),
        signal: AbortSignal.timeout(10000),
      })
      if (initRes.ok) {
        mcpSessionId = initRes.headers.get('mcp-session-id')
        console.log('[api/stitch-mcp] Session initialized:', mcpSessionId)
      } else {
        const errText = await initRes.text().catch(() => '')
        console.error('[api/stitch-mcp] Init failed:', initRes.status, errText)
      }
    }

    const mcpPayload = { jsonrpc: '2.0', id: Date.now(), method, ...(params ? { params } : {}) }
    const headers = { ...authHeaders }
    if (mcpSessionId) headers['Mcp-Session-Id'] = mcpSessionId

    const mcpRes = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(mcpPayload),
      signal: AbortSignal.timeout(25000),
    })

    if (!mcpRes.ok) {
      const errText = await mcpRes.text().catch(() => 'Unknown Stitch error')
      console.error('[api/stitch-mcp] Stitch error:', mcpRes.status, errText)
      if (mcpRes.status >= 400 && mcpRes.status < 500) mcpSessionId = null
      return res.status(mcpRes.status || 502).json({ error: 'Stitch MCP error', detail: errText })
    }

    const newSessionId = mcpRes.headers.get('mcp-session-id')
    if (newSessionId) mcpSessionId = newSessionId

    const data = await mcpRes.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('[api/stitch-mcp] Error:', err)
    return res.status(500).json({ error: 'Stitch proxy error', message: err.message })
  }
}