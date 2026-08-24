import { ref } from 'vue'

const GEMINI_MODEL = 'gemini-2.5-flash-image'

// Server-configured: GEMINI_API_KEY lives server-side only (no VITE_ prefix,
// never bundled into client JS) behind /api/gemini-proxy. If the user has
// set their own key in Brand Settings, that takes priority and calls Gemini
// directly with their own key/quota.
const SERVER_PROXIED = (import.meta.env.VITE_GEMINI_SERVER_PROXY as string) === 'true'

// Priority: user-entered key (localStorage) > env-injected key (VITE_GEMINI_API_KEY)
const apiKey = ref(
  localStorage.getItem('designflow-gemini-key') || (import.meta.env.VITE_GEMINI_API_KEY as string) || ''
)

export function useImageGen() {
  const generating = ref(false)
  const error = ref<string | null>(null)

  function setApiKey(key: string) {
    apiKey.value = key
    localStorage.setItem('designflow-gemini-key', key)
  }

  function getApiKey() {
    return apiKey.value
  }

  function buildGenerateRequest(useServerKey: boolean): { url: string; headers: Record<string, string> } {
    if (useServerKey) {
      return {
        url: `${window.location.origin}/api/gemini-proxy/models/${GEMINI_MODEL}:generateContent`,
        headers: { 'Content-Type': 'application/json' },
      }
    }
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.value },
    }
  }

  function extractImageParts(data: unknown): { imageData: { base64: string; mimeType: string } | null; textContent: string } {
    const typed = data as { candidates?: { content?: { parts?: unknown[] } }[] } | undefined
    const parts = typed?.candidates?.[0]?.content?.parts ?? []
    let imageData: { base64: string; mimeType: string } | null = null
    let textContent = ''

    for (const part of parts as { inlineData?: { data: string; mimeType?: string }; text?: string }[]) {
      if (part.inlineData) {
        imageData = {
          base64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png',
        }
      }
      if (part.text) {
        textContent += part.text
      }
    }

    return { imageData, textContent }
  }

  async function generateImage(prompt: string): Promise<{ base64: string; mimeType: string; text?: string } | null> {
    const useServerKey = SERVER_PROXIED && !apiKey.value
    if (!apiKey.value && !useServerKey) {
      error.value = 'Image generation key not set. Add VITE_GEMINI_API_KEY to your environment.'
      return null
    }

    generating.value = true
    error.value = null

    try {
      const { url, headers } = buildGenerateRequest(useServerKey)
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        error.value = err?.error?.message || `Gemini API error: ${res.status}`
        return null
      }

      const data = await res.json()
      const { imageData, textContent } = extractImageParts(data)

      if (!imageData) {
        error.value = 'No image generated. Try a different prompt.'
        return null
      }

      return { ...imageData, text: textContent || undefined }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to generate image'
      return null
    } finally {
      generating.value = false
    }
  }

  /** Track blob URLs for cleanup */
  const blobUrls: string[] = []

  /** Convert base64 to a blob URL for canvas rendering */
  function base64ToBlobUrl(base64: string, mimeType: string): string {
    const bytes = atob(base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const blob = new Blob([arr], { type: mimeType })
    const url = URL.createObjectURL(blob)
    blobUrls.push(url)
    return url
  }

  /** Revoke all tracked blob URLs to free memory */
  function revokeAll() {
    for (const url of blobUrls) URL.revokeObjectURL(url)
    blobUrls.length = 0
  }

  return {
    generating,
    error,
    apiKey,
    setApiKey,
    getApiKey,
    generateImage,
    base64ToBlobUrl,
    revokeAll,
  }
}
