// 最小埋点模块：记录、持久化、恢复、环形缓冲、调试口
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearAnalyticsEvents,
  getAnalyticsEvents,
  track,
} from '@/lib/analytics'

const STORAGE_KEY = 'lutris.analytics.v1'

beforeEach(() => {
  clearAnalyticsEvents()
})

describe('track / getAnalyticsEvents', () => {
  it('记录事件，带时间戳、session 和扁平 props', () => {
    track('phase_advanced', { from: 'idea', to: 'spec' })
    const events = getAnalyticsEvents()
    expect(events).toHaveLength(1)
    expect(events[0].event).toBe('phase_advanced')
    expect(events[0].props).toEqual({ from: 'idea', to: 'spec' })
    expect(events[0].t).toBeGreaterThan(0)
    expect(events[0].session).toBeTruthy()
  })

  it('同一 session 内多次事件共享 session id', () => {
    track('a')
    track('b')
    const [e1, e2] = getAnalyticsEvents()
    expect(e1.session).toBe(e2.session)
  })

  it('持久化到 localStorage，刷新后可恢复', async () => {
    track('code_exported', { framework: 'Vue' })
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(persisted).toHaveLength(1)
    expect(persisted[0].event).toBe('code_exported')

    // 模拟页面刷新：重置模块注册表后重新 import，新实例应从 localStorage 恢复
    vi.resetModules()
    const fresh = await import('@/lib/analytics')
    const restored = fresh.getAnalyticsEvents()
    expect(restored.some((e) => e.event === 'code_exported')).toBe(true)
  })

  it('环形缓冲封顶 500 条，最旧的被淘汰', () => {
    for (let i = 0; i < 510; i++) track('spam', { i })
    const events = getAnalyticsEvents()
    expect(events.length).toBe(500)
    // 最旧的一条应该是 i=10
    expect(events[0].props?.i).toBe(10)
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(persisted.length).toBe(500)
  })

  it('clear 清空内存和 localStorage', () => {
    track('x')
    clearAnalyticsEvents()
    expect(getAnalyticsEvents()).toHaveLength(0)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe('调试口', () => {
  it('window.__LUTRIS_ANALYTICS__ 暴露 events / track / clear', () => {
    // 注意：前面的 resetModules 用例可能让 window 上挂着新实例，
    // 这里只用 window API 自身做闭环断言，不与静态 import 的实例混用。
    const api = (window as any).__LUTRIS_ANALYTICS__
    expect(api).toBeTruthy()
    api.clear()
    api.track('via-window', { k: 1 })
    const events = api.events
    expect(events.some((e: any) => e.event === 'via-window')).toBe(true)
    expect(events.at(-1).props).toEqual({ k: 1 })
    api.clear()
    expect(api.events).toHaveLength(0)
  })
})
