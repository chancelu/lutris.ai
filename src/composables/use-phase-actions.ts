// ── 用户主导的阶段动作（P1）──
// AI 的 submit_xxx 工具是"自动通道"，这里的函数是"用户按钮通道"——
// 两边最终都走同一个 usePipeline().advancePhase()，校验逻辑共享。
// 目标：每一步用户都有一个看得见的推进动作，不必等 AI 自觉提交。

import { selectionToCode } from '@llc3233149/core'

import { useAIChat } from '@/composables/use-chat'
import { usePipeline } from '@/composables/use-pipeline'
import { useSpec } from '@/composables/use-spec'
import { toast } from '@/composables/use-toast'
import { useEditorStore } from '@/stores/editor'
// 与 code-output store 相同的深相对导入：core 的 exports map 只暴露 index，
// 但 listener registry 必须和工具注册表指向同一个模块实例。
import { notifyCodeExport } from '../../packages/core/src/tools/export-code'

import type { CodeFormat } from '@llc3233149/core'

/** 画布当前页的顶层 Frame 列表（Design 阶段的"页面"载体） */
function topLevelFrames(): Array<{ id: string; name: string }> {
  const store = useEditorStore()
  const pageId = store.state.currentPageId
  if (!pageId) return []
  try {
    return store.graph
      .getChildren(pageId)
      .filter((n: { type: string }) => n.type === 'FRAME')
      .map((n: { id: string; name: string }) => ({ id: n.id, name: n.name }))
  } catch {
    return []
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * 构造 Design 阶段产出契约 pageNodeMap（SpecPage.id → 画布 Frame node id）。
 * 匹配策略：名字精确匹配 → 名字互相包含 → 按顺序兜底分配剩余 Frame。
 * 无 Spec（skipToDesign 路径）时退化为 frame 自身 id 做 key。
 * 画布上一个 Frame 都没有时返回 null（调用方应提示用户先生成设计）。
 */
export function buildPageNodeMap(): Record<string, string> | null {
  const frames = topLevelFrames()
  if (frames.length === 0) return null

  const { pages } = useSpec()
  const specPages = pages.value

  // 无 spec 时：key 用 frame 自己的 id（契约只要求非空映射）
  if (specPages.length === 0) {
    return Object.fromEntries(frames.map((f) => [f.id, f.id]))
  }

  const map: Record<string, string> = {}
  const used = new Set<string>()

  const exactMatch = (name: string) =>
    frames.find((f) => !used.has(f.id) && normalizeName(f.name) === normalizeName(name))
  const fuzzyMatch = (name: string) =>
    frames.find((f) => {
      if (used.has(f.id)) return false
      const a = normalizeName(f.name)
      const b = normalizeName(name)
      return a.includes(b) || b.includes(a)
    })

  for (const page of specPages) {
    const hit = exactMatch(page.name) ?? fuzzyMatch(page.name)
    if (hit) {
      map[page.id] = hit.id
      used.add(hit.id)
    }
  }
  // 顺序兜底：还没匹配上的 spec 页面按顺序分配剩余 frame
  const remaining = frames.filter((f) => !used.has(f.id))
  for (const page of specPages) {
    if (map[page.id]) continue
    const next = remaining.shift()
    if (next) map[page.id] = next.id
  }

  return Object.keys(map).length > 0 ? map : null
}

/**
 * Design → Dev 的用户侧推进按钮动作。
 * 成功：推进阶段 + 给 AI 发一条"设计已确认，请导出代码"的消息（AI 已配置时
 * 会自动接力完成导出和 submit_dev_output；未配置时用户可用 Code 面板的
 * 无 AI 直出按钮）。失败：toast 展示校验原因。
 */
export function finishDesignAndGoToDev(): boolean {
  const { advancePhase } = usePipeline()
  const { pendingMessage, isConfigured } = useAIChat()

  const pageNodeMap = buildPageNodeMap()
  if (!pageNodeMap) {
    toast.show('画布上还没有页面设计——先让 AI 生成，或手动创建一个 Frame', 'warning')
    return false
  }

  const result = advancePhase('design', { pageNodeMap, renderedAt: Date.now() })
  if (!result.valid) {
    toast.show(result.reason ?? '设计产出校验未通过', 'warning')
    return false
  }

  if (isConfigured.value) {
    pendingMessage.value =
      '设计已确认。请用 export_code 把画布上的页面导出为 Vue 和 React 代码，然后调用 submit_dev_output 完成交付。'
  }
  return true
}

/**
 * Dev 阶段的无 AI 直出：把画布顶层 Frame（或 design 产出记录的节点）
 * 直接跑 selectionToCode 生成 Vue + React 双框架代码，经 notifyCodeExport
 * 流入 code-output store——Code 面板的框架 tab 随即亮起。
 * 返回 false 表示画布上没有可导出的内容。
 */
export function exportCodeDirectly(): boolean {
  const { outputs } = usePipeline()
  const store = useEditorStore()

  // 优先用 design 产出里记录的页面节点；否则退到当前页顶层 Frame
  const mappedIds = Object.values(outputs.value.design?.pageNodeMap ?? {})
  const ids = mappedIds.length > 0 ? mappedIds : topLevelFrames().map((f) => f.id)
  if (ids.length === 0) {
    toast.show('画布上没有可导出的内容', 'warning')
    return false
  }

  let exported = 0
  for (const format of ['vue-sfc', 'react'] satisfies CodeFormat[]) {
    try {
      const code = selectionToCode(ids, store.graph, format)
      if (code && code.trim().length > 0) {
        notifyCodeExport({ format, code, nodeCount: ids.length })
        exported++
      }
    } catch (err) {
      console.error(`[phase-actions] direct export failed for ${format}:`, err)
    }
  }

  if (exported === 0) {
    toast.show('导出失败——请检查画布内容后重试', 'error')
    return false
  }
  toast.show('已生成 Vue / React 代码', 'success')
  return true
}
