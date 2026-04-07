import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.anthropic.com'
const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6'
const AI_PROVIDER = process.env.AI_PROVIDER || 'anthropic'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  // CORS — restrict to known origins
  const ALLOWED_ORIGINS = [
    'https://lutris.ai',
    'https://app.lutris.ai',
    'http://localhost:1420',
    'http://localhost:5173',
  ]
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify JWT
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Proxy to AI provider
  try {
    const body = req.body
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request: messages array required' })
    }
    if (body.max_tokens != null && (typeof body.max_tokens !== 'number' || body.max_tokens > 16384)) {
      return res.status(400).json({ error: 'Invalid max_tokens (must be number <= 16384)' })
    }
    const messages = body.messages
    const model = AI_MODEL
    const stream = body.stream ?? false

    let targetUrl = ''
    let headers = {}
    let payload = {}

    if (AI_PROVIDER === 'anthropic' || AI_PROVIDER === 'anthropic-compatible') {
      targetUrl = `${AI_BASE_URL}/v1/messages`
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': AI_API_KEY,
        'anthropic-version': '2023-06-01',
      }
      payload = {
        model,
        max_tokens: body.max_tokens || 4096,
        messages,
        stream,
      }
    } else {
      // OpenAI-compatible
      targetUrl = `${AI_BASE_URL}/v1/chat/completions`
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      }
      payload = {
        model,
        messages: messages,
        max_tokens: body.max_tokens || 4096,
        stream,
      }
    }

    const aiRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(55000),
    })

    if (stream) {
      if (!aiRes.ok || !aiRes.body) {
        const errText = await aiRes.text().catch(() => 'Unknown upstream error')
        return res.status(aiRes.status || 502).json({ error: 'AI provider error' })
      }
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      const reader = aiRes.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(decoder.decode(value, { stream: true }))
      }
      res.end()
    } else {
      const data = await aiRes.json()
      res.status(aiRes.status).json(data)
    }
  } catch (err) {
    console.error('[api/chat] Error:', err)
    res.status(500).json({ error: 'AI proxy error' })
  }
}
