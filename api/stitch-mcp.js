/**
 * Vercel Serverless MCP Proxy for Google Stitch
 *
 * Accepts: POST { method: 'tools/list' | 'tools/call', params: {...} }
 * Authenticates via Google Service Account → OAuth2 access token
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

// Cached access token
let cachedToken = null
let tokenExpiresAt = 0

// Cached MCP session ID (Streamable HTTP requires initialize → session)
let mcpSessionId = null

export const config = { maxDuration: 30 }

/**
 * Base64url encode (no padding) for JWT
 */
function base64url(data) {
  return Buffer.from(data).toString('base64url')
}

/**
 * Sign JWT using RS256 (Service Account private key)
 */
async function signJWT(header, payload, privateKeyPem) {
  const { createSign } = await import('node:crypto')
  const input = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const sign = createSign('RSA-SHA256')
  sign.update(input)
  const signature = sign.sign(privateKeyPem, 'base64url')
  return `${input}.${signature}`
}

/**
 * Get an OAuth2 access token via JWT assertion flow (Service Account)
 */
async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000)

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && tokenExpiresAt > now + 60) return cachedToken

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }

  const jwt = await signJWT(header, payload, serviceAccount.private_key)

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

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  if (!saJson) return res.status(503).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not configured' })

  const { method, params } = req.body || {}
  if (!method || !ALLOWED_METHODS.includes(method)) {
    return res.status(400).json({ error: `Invalid MCP method. Allowed: ${ALLOWED_METHODS.join(', ')}` })
  }

  try {
    const serviceAccount = JSON.parse(saJson)
    const accessToken = await getAccessToken(serviceAccount)

    const baseHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    }
    if (projectId) baseHeaders['X-Goog-User-Project'] = projectId

    // Auto-initialize MCP session if we don't have one
    if (!mcpSessionId && method !== 'initialize') {
      const initPayload = { jsonrpc: '2.0', id: Date.now() - 1, method: 'initialize', params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'lutris-stitch-proxy', version: '1.0.0' },
      }}
      const initRes = await fetch(STITCH_ENDPOINT, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(initPayload),
        signal: AbortSignal.timeout(10000),
      })
      if (initRes.ok) {
        mcpSessionId = initRes.headers.get('mcp-session-id')
      }
    }

    const mcpPayload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      ...(params ? { params } : {}),
    }

    const headers = { ...baseHeaders }
    if (mcpSessionId) headers['Mcp-Session-Id'] = mcpSessionId

    const mcpRes = await fetch(STITCH_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(mcpPayload),
      signal: AbortSignal.timeout(25000),
    })

    if (!mcpRes.ok) {
      const errText = await mcpRes.text().catch(() => 'Unknown Stitch error')
      console.error('[api/stitch-mcp] Stitch error:', mcpRes.status, errText)
      // Reset session on 4xx errors — may need re-init
      if (mcpRes.status >= 400 && mcpRes.status < 500) mcpSessionId = null
      return res.status(mcpRes.status || 502).json({ error: 'Stitch MCP error', detail: errText })
    }

    // Capture session ID from response
    const newSessionId = mcpRes.headers.get('mcp-session-id')
    if (newSessionId) mcpSessionId = newSessionId

    const data = await mcpRes.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('[api/stitch-mcp] Error:', err)
    return res.status(500).json({ error: 'Stitch proxy error', message: err.message })
  }
}