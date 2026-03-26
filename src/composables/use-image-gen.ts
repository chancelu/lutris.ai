import { ref } from 'vue'

const GEMINI_MODEL = 'gemini-2.5-flash-image'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'

const apiKey = ref(
  localStorage.getItem('designflow-gemini-key') ||
  (import.meta.env.VITE_GEMINI_API_KEY as string) ||
  ''
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

  async function generateImage(prompt: string): Promise<{ base64: string; mimeType: string; text?: string } | null> {
    if (!apiKey.value) {
      error.value = 'Gemini API key not set. Go to Brand Settings to configure.'
      return null
    }

    generating.value = true
    error.value = null

    try {
      const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.value },
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
      const parts = data?.candidates?.[0]?.content?.parts || []

      let imageData: { base64: string; mimeType: string } | null = null
      let textContent = ''

      for (const part of parts) {
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

  /** Convert base64 to a blob URL for canvas rendering */
  function base64ToBlobUrl(base64: string, mimeType: string): string {
    const bytes = atob(base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const blob = new Blob([arr], { type: mimeType })
    return URL.createObjectURL(blob)
  }

  return {
    generating,
    error,
    apiKey,
    setApiKey,
    getApiKey,
    generateImage,
    base64ToBlobUrl,
  }
}
