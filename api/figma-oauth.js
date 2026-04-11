export const config = { maxDuration: 15 }

export default async function handler(req, res) {
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code } = req.body || {}
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  const clientId = process.env.FIGMA_CLIENT_ID
  const clientSecret = process.env.FIGMA_CLIENT_SECRET
  const redirectUri = process.env.FIGMA_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    return res.status(503).json({ error: 'Figma OAuth not configured on server' })
  }

  try {
    const tokenRes = await fetch('https://www.figma.com/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => 'Unknown error')
      console.error('[figma-oauth] Token exchange failed:', tokenRes.status, errText)
      return res.status(tokenRes.status >= 400 && tokenRes.status < 500 ? 400 : 502).json({
        error: 'Failed to exchange authorization code',
      })
    }

    const data = await tokenRes.json()
    res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in,
    })
  } catch (err) {
    console.error('[figma-oauth] Error:', err)
    res.status(500).json({ error: 'OAuth token exchange failed' })
  }
}
