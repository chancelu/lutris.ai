export const config = { maxDuration: 60 }

const ALLOWED_ORIGINS = [
  'https://lutris.ai',
  'https://app.lutris.ai',
  'https://lutris-ai.vercel.app',
  'http://localhost:1420',
  'http://localhost:5173',
]

const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com'

/**
 * Server-side proxy for Gemini API calls. The real GEMINI_API_KEY lives only
 * in this backend's env (no VITE_ prefix), so it never reaches the browser
 * bundle. Client requests hit /api/gemini-proxy/<rest-of-path> and this
 * handler forwards them to Google's API with the key injected server-side.
 *
 * Implemented as a single flat file (not a [...path] catch-all) because
 * Vercel's dynamic catch-all routing did not reliably match multi-segment
 * paths containing ':' (e.g. "models/gemini-x:generateContent") in this
 * project's rewrite config — parsing req.url manually here avoids that.
 */
export default async function handler(req, res) {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini proxy not configured on server' })
  }

  // vercel.json rewrites /api/gemini-proxy/<rest> to
  // /api/gemini-proxy?geminiPath=/<rest>&<original query>, so the real
  // upstream path arrives as a query param instead of relying on dynamic
  // catch-all file routing (which didn't reliably match ':' in segments).
  const restPath = typeof req.query.geminiPath === 'string' ? req.query.geminiPath : '/'
  const otherParams = new URLSearchParams(
    Object.entries(req.query).filter(([key]) => key !== 'geminiPath' && key !== 'path')
  )
  const query = otherParams.toString() ? `?${otherParams.toString()}` : ''

  const upstreamPath = restPath.startsWith('/v1beta') || restPath.startsWith('/v1')
    ? restPath
    : `/v1beta${restPath}`

  const upstreamUrl = `${GOOGLE_API_BASE}${upstreamPath}${query}`

  let body
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body,
    })

    const contentType = upstreamRes.headers.get('content-type') || 'application/json'
    res.setHeader('Content-Type', contentType)
    res.status(upstreamRes.status)

    if (upstreamRes.body && typeof upstreamRes.body.pipeTo === 'function') {
      const reader = upstreamRes.body.getReader()
      const pump = async () => {
        const { done, value } = await reader.read()
        if (done) {
          res.end()
          return
        }
        res.write(Buffer.from(value))
        await pump()
      }
      await pump()
    } else {
      const text = await upstreamRes.text()
      res.send(text)
    }
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Gemini API', detail: String(err?.message || err) })
  }
}
