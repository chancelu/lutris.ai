import { ref } from 'vue'

// ── 图像生成（provider 可配置，不再绑定 Gemini）──
// 两种 provider：
//   1. gemini —— 原路径：generateContent API，支持服务器代理（/api/gemini-proxy，
//      服务端 GEMINI_API_KEY 不进 client bundle）；用户自己的 key 优先于代理
//   2. openai-images —— 任何 OpenAI 兼容的 /images/generations 端点
//      （OpenAI gpt-image 系列、Doubao Seedream、SiliconFlow、各类中转站…），
//      baseURL + model + key 全部由用户在 Provider Settings 里配置
// 配置持久化在 localStorage（lutris-image-gen）；旧版 designflow-gemini-key
// 已作废——加载时直接清除本地残留，不做迁移。

export type ImageGenProvider = 'gemini' | 'openai-images'

export interface ImageGenConfig {
  provider: ImageGenProvider
  apiKey: string
  /** openai-images 必填，如 https://api.openai.com/v1 */
  baseURL: string
  /** openai-images 必填，如 gpt-image-1 / doubao-seedream-4-5 */
  model: string
}

const CONFIG_KEY = 'lutris-image-gen'
// 旧版独立 key 已作废：不做迁移，加载时直接清除本地残留
const LEGACY_GEMINI_KEY = 'designflow-gemini-key'

const GEMINI_MODEL = 'gemini-2.5-flash-image'

// Server-configured: GEMINI_API_KEY lives server-side only (no VITE_ prefix,
// never bundled into client JS) behind /api/gemini-proxy. If the user has
// set their own key, that takes priority and calls Gemini directly with
// their own key/quota.
const SERVER_PROXIED = (import.meta.env.VITE_GEMINI_SERVER_PROXY as string) === 'true'

export function loadImageGenConfig(): ImageGenConfig {
  localStorage.removeItem(LEGACY_GEMINI_KEY)
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ImageGenConfig>
      return {
        provider: parsed.provider === 'openai-images' ? 'openai-images' : 'gemini',
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
        baseURL: typeof parsed.baseURL === 'string' ? parsed.baseURL : '',
        model: typeof parsed.model === 'string' ? parsed.model : '',
      }
    }
  } catch {
    // fall through to env/default
  }
  return {
    provider: 'gemini',
    apiKey: (import.meta.env.VITE_GEMINI_API_KEY as string) || '',
    baseURL: '',
    model: '',
  }
}

const config = ref<ImageGenConfig>(loadImageGenConfig())

function persist() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config.value))
}

// ── 纯函数：请求构造与响应解析（导出供单测）──

export interface ImageGenRequest {
  url: string
  headers: Record<string, string>
  body: unknown
}

/** 把任意宽高比归一到 OpenAI images API 的标准尺寸 */
export function nearestImageSize(width = 1024, height = 1024): string {
  const ratio = width / Math.max(1, height)
  if (ratio > 1.2) return '1536x1024'
  if (ratio < 0.8) return '1024x1536'
  return '1024x1024'
}

export function buildImageGenRequest(
  cfg: ImageGenConfig,
  prompt: string,
  opts?: { width?: number; height?: number; useServerProxy?: boolean }
): ImageGenRequest {
  if (cfg.provider === 'openai-images') {
    const base = cfg.baseURL.replace(/\/+$/, '')
    return {
      url: `${base}/images/generations`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: {
        model: cfg.model,
        prompt,
        size: nearestImageSize(opts?.width, opts?.height),
      },
    }
  }
  // gemini
  if (opts?.useServerProxy) {
    return {
      url: `${window.location.origin}/api/gemini-proxy/models/${GEMINI_MODEL}:generateContent`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      },
    }
  }
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
    body: {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    },
  }
}

export interface ParsedImage {
  imageData: { base64: string; mimeType: string } | null
  textContent: string
}

export function parseImageGenResponse(provider: ImageGenProvider, data: unknown): ParsedImage {
  if (provider === 'openai-images') {
    const typed = data as { data?: Array<{ b64_json?: string; url?: string }> } | undefined
    const first = typed?.data?.[0]
    if (first?.b64_json) {
      return { imageData: { base64: first.b64_json, mimeType: 'image/png' }, textContent: '' }
    }
    // url 形态由调用方再 fetch 转 base64（parse 保持纯函数）
    return { imageData: null, textContent: first?.url ?? '' }
  }
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

export function useImageGen() {
  const generating = ref(false)
  const error = ref<string | null>(null)

  function setConfig(patch: Partial<ImageGenConfig>) {
    config.value = { ...config.value, ...patch }
    persist()
  }

  async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      const blob = await res.blob()
      const buf = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (const byte of buf) binary += String.fromCharCode(byte)
      return { base64: btoa(binary), mimeType: blob.type || 'image/png' }
    } catch {
      return null
    }
  }

  /** 配置前置校验：返回错误文案（null = 可以发起请求） */
  function validateConfig(cfg: ImageGenConfig, useServerKey: boolean): string | null {
    if (cfg.provider === 'openai-images' && (!cfg.baseURL.trim() || !cfg.model.trim())) {
      return 'Image generation not configured: Base URL and Model are required for OpenAI-compatible providers.'
    }
    if (!cfg.apiKey && !useServerKey) {
      return cfg.provider === 'openai-images'
        ? 'Image generation not configured. Set Base URL / Model / API key in Provider Settings.'
        : 'Image generation key not set. Add a Gemini key in Provider Settings or VITE_GEMINI_API_KEY to your environment.'
    }
    return null
  }

  /** 解析响应；openai-images 的 url 形态需要二次 fetch 转 base64 */
  async function extractImage(
    cfg: ImageGenConfig,
    data: unknown
  ): Promise<{ base64: string; mimeType: string; text?: string } | null> {
    const { imageData, textContent } = parseImageGenResponse(cfg.provider, data)
    if (imageData) return { ...imageData, text: textContent || undefined }
    if (cfg.provider === 'openai-images' && textContent.startsWith('http')) {
      const fetched = await urlToBase64(textContent)
      if (fetched) return fetched
      error.value = 'Failed to download generated image from provider URL.'
      return null
    }
    error.value = 'No image generated. Try a different prompt.'
    return null
  }

  async function generateImage(
    prompt: string,
    opts?: { width?: number; height?: number }
  ): Promise<{ base64: string; mimeType: string; text?: string } | null> {
    const cfg = config.value
    const useServerKey = cfg.provider === 'gemini' && SERVER_PROXIED && !cfg.apiKey
    const configError = validateConfig(cfg, useServerKey)
    if (configError) {
      error.value = configError
      return null
    }

    generating.value = true
    error.value = null

    try {
      const { url, headers, body } = buildImageGenRequest(cfg, prompt, {
        width: opts?.width,
        height: opts?.height,
        useServerProxy: useServerKey,
      })
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        error.value = err?.error?.message || `Image API error: ${res.status}`
        return null
      }

      return await extractImage(cfg, await res.json())
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
    config,
    setConfig,
    generateImage,
    base64ToBlobUrl,
    revokeAll,
  }
}
