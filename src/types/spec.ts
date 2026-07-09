// ── Spec 数据模型（PRD §11，Idea→Spec→Design→Dev 一条龙）──
// 替代旧的自由文本 markdown SpecPanel + RequirementsBoard。
// Spec 是 Idea 对话阶段的产出，也是 Design 阶段生成设计稿的直接输入,
// 所以字段必须是"AI工具能直接消费的结构",不是给人看的文档。

export type SpecSource = 'user' | 'design' | 'import' | 'ai'

export type SpecTargetPlatform = 'web' | 'mobile-web' | 'desktop'

export type SpecComponentRole =
  | 'container'
  | 'list-item'
  | 'form'
  | 'navigation'
  | 'display'
  | 'action'

export interface SpecComponent {
  id: string
  /** 如 "ProductCard"，会直接用作生成代码的组件名 */
  name: string
  role: SpecComponentRole
  /**
   * true = 这是一个会重复出现的组件（如列表项）。
   * 给 Dev 阶段代码生成器的显式提示："这个应该被提取成独立可复用组件"，
   * 而不是靠场景图结构自动推断（Spike #1 已验证自动推断不可靠）。
   */
  repeatable: boolean
  /** 如 "product.name"，说明这个组件绑定什么数据（供代码生成器生成 props） */
  dataBinding?: string
  /** 嵌套组件 */
  children?: SpecComponent[]
}

export interface SpecInteractionRule {
  id: string
  /** 如 "点击购买按钮" */
  trigger: string
  /** 如 "跳转到结算页并携带商品ID" */
  action: string
  /** 如果是页面跳转，关联目标页面 */
  targetPageId?: string
}

export interface SpecPage {
  id: string
  /** 如 "商品列表页" */
  name: string
  /** 如 "/products"，供 Dev 阶段生成路由 */
  route: string
  /** 一句话描述这个页面解决什么问题 */
  purpose: string
  /** "作为一个xx，我想要xx，以便xx" */
  userStory: string
  components: SpecComponent[]
  interactionRules: SpecInteractionRule[]
}

export interface SpecColorToken {
  name: string
  value: string
  usage: string
}

export interface SpecTypographyToken {
  name: string
  fontSize: number
  fontWeight: number
  usage: string
}

export type SpecCornerRadiusStyle = 'sharp' | 'rounded' | 'pill'

export interface SpecDesignSystem {
  colorTokens: SpecColorToken[]
  typographyTokens: SpecTypographyToken[]
  /** 基础间距单位，如 8（用于生成 8px/16px/24px 等间距） */
  spacingUnit: number
  cornerRadiusStyle: SpecCornerRadiusStyle
}

export interface SpecVersion {
  id: number
  timestamp: number
  source: SpecSource
  label?: string
  /** 该版本的 Spec 快照 */
  snapshot: SpecSnapshot
}

/** 可被序列化/快照的 Spec 核心字段（不含版本历史，避免嵌套快照套快照） */
export interface SpecSnapshot {
  projectName: string
  createdFromIdeaBriefId: string
  targetPlatform: SpecTargetPlatform
  pages: SpecPage[]
  designSystem: SpecDesignSystem
  /** 兜底字段：结构化字段覆盖不到的信息，允许自由文本 */
  freeformNotes: string
}

export interface SpecDocument {
  id: string
  projectId?: string
  /** 每次人工编辑 +1，用于 Design 阶段判断是否需要重新生成 */
  version: number
  versionCounter: number
  versions: SpecVersion[]
  data: SpecSnapshot
}

let _specIdCounter = 0

export function generateSpecId(): string {
  return `spec_${Date.now()}_${(++_specIdCounter).toString(36)}`
}

export function createEmptyDesignSystem(): SpecDesignSystem {
  return {
    colorTokens: [],
    typographyTokens: [],
    spacingUnit: 8,
    cornerRadiusStyle: 'rounded',
  }
}

export function createEmptySpecSnapshot(): SpecSnapshot {
  return {
    projectName: '',
    createdFromIdeaBriefId: '',
    targetPlatform: 'web',
    pages: [],
    designSystem: createEmptyDesignSystem(),
    freeformNotes: '',
  }
}

export function createEmptySpecDocument(): SpecDocument {
  return {
    id: generateSpecId(),
    version: 0,
    versionCounter: 0,
    versions: [],
    data: createEmptySpecSnapshot(),
  }
}

let _pageIdCounter = 0
let _componentIdCounter = 0
let _ruleIdCounter = 0

export function createSpecPage(name: string, opts?: Partial<Omit<SpecPage, 'id' | 'name'>>): SpecPage {
  return {
    id: `page_${Date.now()}_${(++_pageIdCounter).toString(36)}`,
    name,
    route: opts?.route ?? '/',
    purpose: opts?.purpose ?? '',
    userStory: opts?.userStory ?? '',
    components: opts?.components ?? [],
    interactionRules: opts?.interactionRules ?? [],
  }
}

export function createSpecComponent(name: string, opts?: Partial<Omit<SpecComponent, 'id' | 'name'>>): SpecComponent {
  return {
    id: `comp_${Date.now()}_${(++_componentIdCounter).toString(36)}`,
    name,
    role: opts?.role ?? 'display',
    repeatable: opts?.repeatable ?? false,
    dataBinding: opts?.dataBinding,
    children: opts?.children,
  }
}

export function createSpecInteractionRule(trigger: string, action: string, targetPageId?: string): SpecInteractionRule {
  return {
    id: `rule_${Date.now()}_${(++_ruleIdCounter).toString(36)}`,
    trigger,
    action,
    targetPageId,
  }
}

/** 生成一段可读的自然语言摘要，供 Design 阶段的 AI prompt 或旧版兼容展示使用 */
export function summarizeSpec(data: SpecSnapshot): string {
  const parts: string[] = []
  if (data.projectName) parts.push(`# ${data.projectName}`)
  for (const page of data.pages) {
    parts.push(`\n## ${page.name} (${page.route})`)
    if (page.purpose) parts.push(page.purpose)
    if (page.userStory) parts.push(`> ${page.userStory}`)
    if (page.components.length > 0) {
      parts.push('组件：')
      for (const c of page.components) {
        parts.push(`- ${c.name} [${c.role}]${c.repeatable ? ' (repeatable)' : ''}`)
      }
    }
    if (page.interactionRules.length > 0) {
      parts.push('交互规则：')
      for (const r of page.interactionRules) {
        parts.push(`- ${r.trigger} → ${r.action}`)
      }
    }
  }
  if (data.freeformNotes) parts.push(`\n## 备注\n${data.freeformNotes}`)
  return parts.join('\n')
}
