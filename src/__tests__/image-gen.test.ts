/**
 * Image-gen provider 解耦单测（use-image-gen）。
 *
 * 锁定契约：
 * - 请求构造：gemini（直连/服务器代理）与 openai-images（/images/generations）两条路径
 * - 响应解析：gemini inlineData / openai-images b64_json 与 url 两种形态
 * - 尺寸归一：任意宽高比 → OpenAI images 标准尺寸
 * - 配置迁移：旧版 designflow-gemini-key 自动接管
 */
import { beforeEach, describe, expect, it } from 'vitest'

import {
  buildImageGenRequest,
  loadImageGenConfig,
  nearestImageSize,
  parseImageGenResponse,
  useImageGen,
  type ImageGenConfig,
} from '@/composables/use-image-gen'

const geminiCfg: ImageGenConfig = { provider: 'gemini', apiKey: 'g-key', baseURL: '', model: '' }
const openaiCfg: ImageGenConfig = {
  provider: 'openai-images',
  apiKey: 'sk-test',
  baseURL: 'https://api.openai.com/v1/',
  model: 'gpt-image-1',
}

beforeEach(() => {
  localStorage.clear()
})

describe('buildImageGenRequest', () => {
  it('openai-images：打 /images/generations，Bearer 鉴权，baseURL 尾部斜杠归一', () => {
    const req = buildImageGenRequest(openaiCfg, 'a cat', { width: 800, height: 400 })
    expect(req.url).toBe('https://api.openai.com/v1/images/generations')
    expect(req.headers.Authorization).toBe('Bearer sk-test')
    const body = req.body as { model: string; prompt: string; size: string }
    expect(body.model).toBe('gpt-image-1')
    expect(body.prompt).toBe('a cat')
    expect(body.size).toBe('1536x1024')
  })

  it('gemini 直连：x-goog-api-key + generateContent 载荷', () => {
    const req = buildImageGenRequest(geminiCfg, 'hero bg')
    expect(req.url).toContain('generativelanguage.googleapis.com')
    expect(req.url).toContain('gemini-2.5-flash-image')
    expect(req.headers['x-goog-api-key']).toBe('g-key')
    const body = req.body as { contents: Array<{ parts: Array<{ text: string }> }> }
    expect(body.contents[0].parts[0].text).toBe('hero bg')
  })

  it('gemini 服务器代理：不带 key，打本地 /api/gemini-proxy', () => {
    const req = buildImageGenRequest(
      { provider: 'gemini', apiKey: '', baseURL: '', model: '' },
      'x',
      { useServerProxy: true }
    )
    expect(req.url).toContain('/api/gemini-proxy/')
    expect(req.headers['x-goog-api-key']).toBeUndefined()
  })
})

describe('parseImageGenResponse', () => {
  it('gemini：从 candidates.parts 提取 inlineData 与文本', () => {
    const parsed = parseImageGenResponse('gemini', {
      candidates: [
        { content: { parts: [{ text: 'here you go ' }, { inlineData: { data: 'QUJD', mimeType: 'image/png' } }] } },
      ],
    })
    expect(parsed.imageData).toEqual({ base64: 'QUJD', mimeType: 'image/png' })
    expect(parsed.textContent).toBe('here you go ')
  })

  it('openai-images：b64_json 直接可用', () => {
    const parsed = parseImageGenResponse('openai-images', { data: [{ b64_json: 'QUJD' }] })
    expect(parsed.imageData).toEqual({ base64: 'QUJD', mimeType: 'image/png' })
  })

  it('openai-images：url 形态暂存 URL 供调用方二次 fetch', () => {
    const parsed = parseImageGenResponse('openai-images', { data: [{ url: 'https://cdn.example.com/x.png' }] })
    expect(parsed.imageData).toBeNull()
    expect(parsed.textContent).toBe('https://cdn.example.com/x.png')
  })

  it('空响应不抛异常', () => {
    expect(parseImageGenResponse('gemini', {}).imageData).toBeNull()
    expect(parseImageGenResponse('openai-images', {}).imageData).toBeNull()
  })
})

describe('nearestImageSize', () => {
  it('按宽高比归一到标准尺寸', () => {
    expect(nearestImageSize(1024, 1024)).toBe('1024x1024')
    expect(nearestImageSize(1600, 900)).toBe('1536x1024')
    expect(nearestImageSize(400, 800)).toBe('1024x1536')
    expect(nearestImageSize()).toBe('1024x1024')
  })
})

describe('配置持久化与迁移', () => {
  it('setConfig 持久化到 localStorage，缺省字段保持', () => {
    const { config, setConfig } = useImageGen()
    setConfig({ provider: 'openai-images', baseURL: 'https://ark.cn/v1', model: 'seedream', apiKey: 'k' })
    expect(config.value.provider).toBe('openai-images')
    const stored = JSON.parse(localStorage.getItem('lutris-image-gen')!)
    expect(stored.model).toBe('seedream')
    // 部分更新不清空其它字段
    setConfig({ model: 'seedream-4-5' })
    expect(config.value.baseURL).toBe('https://ark.cn/v1')
  })

  it('旧版 designflow-gemini-key 已作废：加载时清除且不参与配置', () => {
    localStorage.setItem('designflow-gemini-key', 'revoked-key')
    const cfg = loadImageGenConfig()
    expect(cfg.apiKey).not.toBe('revoked-key')
    expect(localStorage.getItem('designflow-gemini-key')).toBeNull()
  })

  it('读取已保存的新配置', () => {
    localStorage.setItem(
      'lutris-image-gen',
      JSON.stringify({ provider: 'openai-images', apiKey: 'new-k', baseURL: 'https://x/v1', model: 'm' })
    )
    const cfg = loadImageGenConfig()
    expect(cfg.provider).toBe('openai-images')
    expect(cfg.apiKey).toBe('new-k')
    expect(cfg.baseURL).toBe('https://x/v1')
  })
})
