// ── 兼容层：旧版自由文本 Requirement 模型 ──
// PRD §11 已用 Page/Component 结构化模型（见 @/types/spec）替代本文件作为 Spec 的核心数据结构。
// 保留此文件仅为向后兼容尚未迁移的少量引用点（如 AI 文本解析辅助函数）；
// 新代码应优先使用 @/types/spec 中的 SpecPage / SpecComponent。

export type RequirementPriority = 'P0' | 'P1' | 'P2'

export type RequirementStatus =
  | 'draft'
  | 'approved'
  | 'in-progress'
  | 'designed'
  | 'delivered'

export interface AcceptanceCriterion {
  id: string
  description: string
  met: boolean
}

export interface Requirement {
  readonly id: string
  title: string
  description: string
  priority: RequirementPriority
  status: RequirementStatus
  userStory: string
  acceptanceCriteria: AcceptanceCriterion[]
  /** Canvas node IDs linked to this requirement */
  linkedNodeIds: string[]
  /** Chat message IDs that discussed this requirement */
  linkedChatMessageIds: string[]
}

export interface Persona {
  role: string
  context: string
  motivation: string
}

export interface SuccessMetric {
  metric: string
  target: string
  timeframe: string
}

let _reqCounter = 0

export function createRequirement(
  title: string,
  opts?: Partial<Omit<Requirement, 'id'>>,
): Requirement {
  return {
    id: `req_${Date.now()}_${(++_reqCounter).toString(36)}`,
    title,
    description: opts?.description ?? '',
    priority: opts?.priority ?? 'P1',
    status: opts?.status ?? 'draft',
    userStory: opts?.userStory ?? '',
    acceptanceCriteria: opts?.acceptanceCriteria ?? [],
    linkedNodeIds: opts?.linkedNodeIds ?? [],
    linkedChatMessageIds: opts?.linkedChatMessageIds ?? [],
  }
}
