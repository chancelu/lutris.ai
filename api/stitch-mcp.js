/**
 * Vercel Serverless MCP Proxy for Google Stitch
 *
 * Uses @google/stitch-sdk for proper auth handling.
 * Accepts: POST { method: 'tools/list' | 'tools/call', params: {...} }
 *
 * Env vars (in priority order):
 *   STITCH_API_KEY — API key from Google AI Studio
 *   STITCH_ACCESS_TOKEN — pre-generated OAuth2 token
 *   GOOGLE_CLOUD_PROJECT_ID — optional, for quota/billing
 */

import { StitchToolClient } from '@google/stitch-sdk'

const ALLOWED_ORIGINS = [
  'https://lutris.ai',
  'https://app.lutris.ai',
  'http://localhost:1420',
  'http://localhost:5173',
]

const ALLOWED_METHODS = ['tools/list', 'tools/call']

let client = null

function getClient() {
  if (client) return client
  const config = {}
  if (process.env.STITCH_API_KEY) config.apiKey = process.env.STITCH_API_KEY
  if (process.env.STITCH_ACCESS_TOKEN) config.accessToken = process.env.STITCH_ACCESS_TOKEN
  if (process.env.GOOGLE_CLOUD_PROJECT_ID) config.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  client = new StitchToolClient(config)
  return client
}

export const config = { maxDuration: 30 }

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
    const stitch = getClient()
    await stitch.connect()

    if (method === 'tools/list') {
      const result = await stitch.listTools()
      return res.status(200).json({ jsonrpc: '2.0', id: 1, result })
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params || {}
      if (!name) return res.status(400).json({ error: 'Missing tool name in params' })
      const result = await stitch.callTool(name, args || {})
      return res.status(200).json({ jsonrpc: '2.0', id: 1, result })
    }

    return res.status(400).json({ error: 'Unsupported method' })
  } catch (err) {
    console.error('[api/stitch-mcp] Error:', err)
    // Reset client on auth errors so next request retries
    if (err.message?.includes('401') || err.message?.includes('auth') || err.message?.includes('Unauthorized')) {
      client = null
    }
    return res.status(500).json({ error: 'Stitch proxy error', message: err.message })
  }
}