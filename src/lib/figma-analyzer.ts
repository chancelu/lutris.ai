// ── Figma Design Analyzer ──
// Ported from Python figma-analyzer: analyzes Figma file structure
// and generates a Chinese product spec in Markdown.

import type { FigmaNode, FigmaFileResponse } from './figma-client'

// ── Interfaces ──

export interface ScreenInfo {
  nodeId: string
  name: string
  width: number
  height: number
  texts: string[]
  componentRefs: string[]
}

export interface PageInfo {
  nodeId: string
  name: string
  screens: ScreenInfo[]
}

export interface ComponentInfo {
  key: string
  name: string
  description: string
  usageCount: number
}

export interface InferredFeature {
  name: string
  source: 'page_name' | 'screen_name' | 'text_content'
  evidence: string
}

export interface UserFlow {
  pageName: string
  steps: string[]
}

export interface AnalysisResult {
  fileName: string
  fileKey: string
  lastModified: string
  pages: PageInfo[]
  components: ComponentInfo[]
  features: InferredFeature[]
  userFlows: UserFlow[]
  totalScreens: number
  totalComponents: number
}

// ── Analysis helpers ──

/** Recursively collect text content from TEXT nodes */
export function collectTexts(node: FigmaNode): string[] {
  const texts: string[] = []
  if (node.type === 'TEXT' && node.characters) {
    const trimmed = node.characters.trim()
    if (trimmed) texts.push(trimmed)
  }
  for (const child of node.children ?? []) {
    texts.push(...collectTexts(child))
  }
  return texts
}

/** Recursively collect component instance names */
export function collectComponentRefs(node: FigmaNode): string[] {
  const refs: string[] = []
  if (node.type === 'INSTANCE' && node.name) {
    refs.push(node.name)
  }
  for (const child of node.children ?? []) {
    refs.push(...collectComponentRefs(child))
  }
  return refs
}

const SCREEN_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET'])

/** Extract top-level screens from a CANVAS page node */
export function extractScreens(canvas: FigmaNode): ScreenInfo[] {
  return (canvas.children ?? [])
    .filter((c) => SCREEN_TYPES.has(c.type))
    .map((c) => ({
      nodeId: c.id,
      name: c.name,
      width: c.absoluteBoundingBox?.width ?? 0,
      height: c.absoluteBoundingBox?.height ?? 0,
      texts: collectTexts(c),
      componentRefs: collectComponentRefs(c),
    }))
}

/** Count INSTANCE usages across the entire document tree */
function countInstanceUsages(node: FigmaNode, counts: Map<string, number>): void {
  if (node.type === 'INSTANCE' && node.componentId) {
    counts.set(node.componentId, (counts.get(node.componentId) ?? 0) + 1)
  }
  for (const child of node.children ?? []) {
    countInstanceUsages(child, counts)
  }
}

/** Extract component definitions with usage counts */
export function extractComponents(fileData: FigmaFileResponse): ComponentInfo[] {
  const usageCounts = new Map<string, number>()
  countInstanceUsages(fileData.document, usageCounts)

  const comps = Object.entries(fileData.components as Record<string, { name: string; description?: string }>)
    .map(([key, meta]) => ({
      key,
      name: meta.name,
      description: meta.description ?? '',
      usageCount: usageCounts.get(key) ?? 0,
    }))

  comps.sort((a, b) => b.usageCount - a.usageCount)
  return comps
}

// ── Feature inference (bilingual keyword matching) ──

const FEATURE_PATTERNS: [string, RegExp][] = [
  ['登录/注册', /login|sign.?in|sign.?up|注册|登录|登陆/i],
  ['搜索', /search|搜索|查找/i],
  ['设置', /setting|设置|偏好|preference/i],
  ['个人中心', /profile|个人|我的|account|用户中心/i],
  ['首页', /home|首页|主页|dashboard|概览/i],
  ['消息/通知', /message|notification|消息|通知|聊天|chat/i],
  ['支付', /pay|支付|结算|checkout|订单|order/i],
  ['购物车', /cart|购物车|basket/i],
  ['详情', /detail|详情|详细/i],
  ['列表', /list|列表|feed/i],
  ['编辑', /edit|编辑|修改|create|新建|添加|add/i],
  ['分享', /share|分享|invite|邀请/i],
  ['收藏', /favorite|收藏|bookmark|like|点赞/i],
  ['上传', /upload|上传|导入|import/i],
  ['导航', /nav|导航|tab.?bar|menu|菜单/i],
]

export function inferFeatures(pages: PageInfo[]): InferredFeature[] {
  const seen = new Set<string>()
  const features: InferredFeature[] = []

  function add(name: string, source: InferredFeature['source'], evidence: string) {
    if (seen.has(name)) return
    seen.add(name)
    features.push({ name, source, evidence })
  }

  for (const page of pages) {
    for (const [name, re] of FEATURE_PATTERNS) {
      if (re.test(page.name)) add(name, 'page_name', page.name)
    }
    for (const screen of page.screens) {
      for (const [name, re] of FEATURE_PATTERNS) {
        if (re.test(screen.name)) add(name, 'screen_name', screen.name)
      }
      for (const text of screen.texts.slice(0, 50)) {
        for (const [name, re] of FEATURE_PATTERNS) {
          if (re.test(text)) add(name, 'text_content', text)
        }
      }
    }
  }
  return features
}

/** Infer user flows from pages with 2+ screens */
export function inferFlows(pages: PageInfo[]): UserFlow[] {
  return pages
    .filter((p) => p.screens.length >= 2)
    .map((p) => ({
      pageName: p.name,
      steps: p.screens.map((s) => s.name),
    }))
}

/** Main entry: analyze a full Figma file response */
export function analyzeFigmaFile(fileData: FigmaFileResponse, fileKey: string): AnalysisResult {
  const pages: PageInfo[] = (fileData.document.children ?? [])
    .filter((c) => c.type === 'CANVAS')
    .map((canvas) => ({
      nodeId: canvas.id,
      name: canvas.name,
      screens: extractScreens(canvas),
    }))

  const components = extractComponents(fileData)
  const features = inferFeatures(pages)
  const userFlows = inferFlows(pages)
  const totalScreens = pages.reduce((sum, p) => sum + p.screens.length, 0)

  return {
    fileName: fileData.name,
    fileKey,
    lastModified: '',
    pages,
    components,
    features,
    userFlows,
    totalScreens,
    totalComponents: components.length,
  }
}

// ── Markdown generation ──

const SOURCE_LABELS: Record<string, string> = {
  page_name: '页面名',
  screen_name: '屏幕名',
  text_content: '文本内容',
}

export function generateProductSpec(result: AnalysisResult): string {
  const lines: string[] = []
  const push = (...s: string[]) => lines.push(...s)

  push(`# ${result.fileName} — 产品规格`, '')
  push('## 产品概述', '')
  push(`- 文件名: ${result.fileName}`)
  push(`- 页面数: ${result.pages.length}`)
  push(`- 屏幕数: ${result.totalScreens}`)
  push(`- 组件数: ${result.totalComponents}`)
  push(`- 识别功能: ${result.features.length}`, '')

  // Features table
  if (result.features.length > 0) {
    push('## 功能清单', '')
    push('| 功能 | 来源 | 依据 |')
    push('|------|------|------|')
    for (const f of result.features) {
      push(`| ${f.name} | ${SOURCE_LABELS[f.source] ?? f.source} | ${f.evidence} |`)
    }
    push('')
  }

  // Page details
  push('## 页面详情', '')
  for (const page of result.pages) {
    push(`### ${page.name}`, '')
    if (page.screens.length === 0) {
      push('_无屏幕_', '')
      continue
    }
    for (const screen of page.screens) {
      push(`#### ${screen.name}`)
      push(`- 尺寸: ${screen.width} × ${screen.height}`)
      const previewTexts = screen.texts.slice(0, 5)
      if (previewTexts.length > 0) {
        push(`- 文本: ${previewTexts.join(' / ')}${screen.texts.length > 5 ? ' ...' : ''}`)
      }
      const uniqueRefs = [...new Set(screen.componentRefs)]
      if (uniqueRefs.length > 0) {
        push(`- 组件: ${uniqueRefs.join(', ')}`)
      }
      push('')
    }
  }

  // Components (top 50)
  const topComps = result.components.slice(0, 50)
  if (topComps.length > 0) {
    push('## 组件库', '')
    push('| 组件名 | 使用次数 | 描述 |')
    push('|--------|----------|------|')
    for (const c of topComps) {
      push(`| ${c.name} | ${c.usageCount} | ${c.description || '-'} |`)
    }
    push('')
  }

  // User flows
  if (result.userFlows.length > 0) {
    push('## 用户流程', '')
    for (const flow of result.userFlows) {
      push(`### ${flow.pageName}`)
      push(flow.steps.join(' → '), '')
    }
  }

  return lines.join('\n')
}
