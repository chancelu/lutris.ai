/**
 * Vercel Serverless MCP Proxy for Google Stitch
 *
 * Stitch API does NOT support API keys — requires OAuth2 access token.
 * Uses Service Account JWT assertion flow to get an access token.
 *
 * Env vars:
 *   GOOGLE_SERVICE_ACCOUNT_JSON — Service Account key JSON (required)
 *   GOOGLE_CLOUD_PROJECT_ID — GCP project ID for X-Goog-User-Project
 */

const STITCH_ENDPOINT = 'https://stitch.googleapis.com/mcp'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

const ALLOWED_ORIGINS = [
  'https://lutris.ai',
  'https://app.lutris.ai',
  'https://lutris-ai.vercel.app',
  'http://localhost:1420',
  'http://localhost:5173',
]

const ALLOWED_METHODS = ['tools/list', 'tools/call']

let cachedToken = null
let tokenExpiresAt = 0

export const config = { maxDuration: 60 }

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

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && tokenExpiresAt > now + 60) return cachedToken

  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!saJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured')

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
    throw new Error(`OAuth2 token failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiresAt = now + (data.expires_in || 3600)
  return cachedToken
}

export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { method, params } = req.body || {}
  if (!method || !ALLOWED_METHODS.includes(method)) {
    return res.status(400).json({ error: `Invalid MCP method. Allowed: ${ALLOWED_METHODS.join(', ')}` })
  }

  try {
    const accessToken = await getAccessToken()
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID

    const authHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${accessToken}`,
    }
    if (projectId) authHeaders['X-Goog-User-Project'] = projectId

    // Always initialize a fresh MCP session per request
    // (Vercel serverless can't reliably persist session across invocations)
    const initPayload = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'lutris-stitch-proxy', version: '1.0.0' },
    }}
    const initRes = await fetch(STITCH_ENDPOINT, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(initPayload),
      signal: AbortSignal.timeout(15000),
    })
    if (!initRes.ok) {
      const errText = await initRes.text().catch(() => '')
      console.error('[stitch-mcp] Init failed:', initRes.status, errText)
      return res.status(initRes.status || 502).json({ error: 'Stitch init failed', detail: errText })
    }
    const sessionId = initRes.headers.get('mcp-session-id')

    const mcpPayload = { jsonrpc: '2.0', id: Date.now(), method, ...(params ? { params } : {}) }
    const headers = { ...authHeaders }
    if (sessionId) headers['Mcp-Session-Id'] = sessionId

    const mcpRes = await fetch(STITCH_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(mcpPayload),
      signal: AbortSignal.timeout(50000),
    })

    if (!mcpRes.ok) {
      const errText = await mcpRes.text().catch(() => 'Unknown error')
      console.error('[stitch-mcp] Error:', mcpRes.status, errText)
      return res.status(mcpRes.status || 502).json({ error: 'Stitch MCP error', detail: errText })
    }

    const data = await mcpRes.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('[stitch-mcp] Error:', err.message || err)
    const message = err.message || 'Unknown error'
    // Provide more specific error messages
    if (message.includes('timeout') || message.includes('abort')) {
      return res.status(504).json({ error: 'Stitch request timed out — generation may take longer than expected', message })
    }
    return res.status(500).json({ error: 'Stitch proxy error', message })
  }
}