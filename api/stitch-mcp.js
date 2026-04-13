/**
 * Vercel Serverless MCP Proxy for Google Stitch
 *
 * Directly calls stitch.googleapis.com/mcp using the same auth headers
 * as @google/stitch-sdk (X-Goog-Api-Key), without the SDK dependency
 * that has issues in serverless environments.
 *
 * Env vars:
 *   STITCH_API_KEY — API key from Google AI Studio (recommended)
 *   STITCH_ACCESS_TOKEN — pre-generated OAuth2 token (alternative)
 *   GOOGLE_CLOUD_PROJECT_ID — optional, for quota/billing
 */

const STITCH_ENDPOINT = 'https://stitch.googleapis.com/mcp'

const ALLOWED_ORIGINS = [
  'https://lutris.ai',
  'https://app.lutris.ai',
  'http://localhost:1420',
  'http://localhost:5173',
]

const ALLOWED_METHODS = ['tools/list', 'tools/call']

let mcpSessionId = null

export const config = { maxDuration: 30 }

function buildAuthHeaders() {
  const apiKey = process.env.STITCH_API_KEY
  const accessToken = process.env.STITCH_ACCESS_TOKEN
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  }

  if (apiKey) {
    headers['X-Goog-Api-Key'] = apiKey
  } else if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
    if (projectId) headers['X-Goog-User-Project'] = projectId
  } else {
    throw new Error('No Stitch credentials. Set STITCH_API_KEY or STITCH_ACCESS_TOKEN.')
  }

  return headers
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
    const authHeaders = buildAuthHeaders()

    // Initialize MCP session if needed
    if (!mcpSessionId) {
      const initPayload = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'lutris-stitch-proxy', version: '1.0.0' },
      }}
      const initRes = await fetch(STITCH_ENDPOINT, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(initPayload),
        signal: AbortSignal.timeout(10000),
      })
      if (initRes.ok) {
        mcpSessionId = initRes.headers.get('mcp-session-id')
        console.log('[stitch-mcp] Session initialized:', mcpSessionId)
      } else {
        const errText = await initRes.text().catch(() => '')
        console.error('[stitch-mcp] Init failed:', initRes.status, errText)
        return res.status(initRes.status || 502).json({ error: 'Stitch init failed', detail: errText })
      }
    }

    // Forward the actual MCP call
    const mcpPayload = { jsonrpc: '2.0', id: Date.now(), method, ...(params ? { params } : {}) }
    const headers = { ...authHeaders }
    if (mcpSessionId) headers['Mcp-Session-Id'] = mcpSessionId

    const mcpRes = await fetch(STITCH_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(mcpPayload),
      signal: AbortSignal.timeout(25000),
    })

    if (!mcpRes.ok) {
      const errText = await mcpRes.text().catch(() => 'Unknown error')
      console.error('[stitch-mcp] Error:', mcpRes.status, errText)
      if (mcpRes.status >= 400 && mcpRes.status < 500) mcpSessionId = null
      return res.status(mcpRes.status || 502).json({ error: 'Stitch MCP error', detail: errText })
    }

    const newSessionId = mcpRes.headers.get('mcp-session-id')
    if (newSessionId) mcpSessionId = newSessionId

    const data = await mcpRes.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('[stitch-mcp] Error:', err)
    mcpSessionId = null
    return res.status(500).json({ error: 'Stitch proxy error', message: err.message })
  }
}