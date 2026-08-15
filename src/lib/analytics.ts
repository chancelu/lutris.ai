// ── 最小埋点（P2）──
// 没有漏斗数据，体验优化就是盲人摸象。这套埋点回答三个问题：
//   1. 用户在哪个阶段流失？（phase_* 事件）
//   2. 用户侧主按钮有没有被用？（CTA 点击事件）
//   3. 交付物有没有被拿走？（code_exported / code_download）
//
// 设计取舍：
// - local-first：只写内存 + localStorage，不发网络请求。
//   这是开源单机产品，先让"数据存在"，以后接远程 sink 只需在 track() 里加一行。
// - 环形缓冲 500 条，防 localStorage 膨胀。
// - window.__LUTRIS_ANALYTICS__ 始终暴露：e2e 断言和用户自查（控制台直接看）都用它。

export interface AnalyticsEvent {
  t: number
  session: string
  event: string
  props?: Record<string, unknown>
}

const STORAGE_KEY = 'lutris.analytics.v1'
const BUFFER_MAX = 500

const session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const buffer: AnalyticsEvent[] = []

function loadPersisted(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const events = JSON.parse(raw) as AnalyticsEvent[]
    if (Array.isArray(events)) buffer.push(...events.slice(-BUFFER_MAX))
  } catch {
    // localStorage 不可用（隐私模式/测试环境）时静默降级为纯内存
  }
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(-BUFFER_MAX)))
  } catch {
    // 同上，静默降级
  }
}

let loaded = false

/** 记录一条埋点事件。event 用 snake_case，props 保持扁平。 */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!loaded) {
    loaded = true
    loadPersisted()
  }
  const entry: AnalyticsEvent = { t: Date.now(), session, event, props }
  buffer.push(entry)
  if (buffer.length > BUFFER_MAX) buffer.splice(0, buffer.length - BUFFER_MAX)
  persist()
  if (import.meta.env.DEV) console.debug('[analytics]', event, props ?? '')
}

/** 当前缓冲的全部事件（旧的在前） */
export function getAnalyticsEvents(): readonly AnalyticsEvent[] {
  if (!loaded) {
    loaded = true
    loadPersisted()
  }
  return buffer
}

export function clearAnalyticsEvents(): void {
  buffer.length = 0
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 静默
  }
}

// e2e 断言 + 用户控制台自查的统一入口
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__LUTRIS_ANALYTICS__ = {
    track,
    get events() {
      return getAnalyticsEvents()
    },
    clear: clearAnalyticsEvents,
  }
}
