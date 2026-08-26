// ── Agent Plan（"agent 跑流水线，人看管和决策"的核心数据结构）──
// Plan 是一等公民：由 orchestrator 的 propose_plan 工具产出（或剧本模式注入），
// 持久化进 PipelineState（复用 IDB 恢复通道），Run Loop 引擎按它驱动跨阶段接力。
// 用户在 Plan 面板上看到的是"agent 打算怎么完成我的目标"，
// 检查点步骤（kind: 'checkpoint'）是 run 暂停、等人做决策的地方。

import type { PipelinePhase } from './pipeline'

export type PlanStepStatus = 'pending' | 'running' | 'done' | 'blocked' | 'skipped' | 'failed'

export type CheckpointType = 'clarify' | 'approve-spec' | 'accept-delivery'

export interface PlanStep {
  id: string
  /** 人类可读标题，Plan 面板直接展示 */
  title: string
  /** 该步骤归属的 pipeline 阶段（run loop 用它决定何时算"完成"） */
  phase: PipelinePhase
  /** auto = agent 自主执行；checkpoint = 到这里暂停，等人决策 */
  kind: 'auto' | 'checkpoint'
  checkpointType?: CheckpointType
  /** 引擎内联动作：'self-check' = 到这一步由引擎直接跑 L1 结构自检（零模型，不烧 turn 等 agent） */
  action?: 'self-check'
  status: PlanStepStatus
  /** 完成/失败时的简短说明（agent 写入或引擎生成） */
  note?: string
}

/** 检查点悬置时挂在 plan 上的待决问题（clarify 专用） */
export interface ClarifyRequest {
  question: string
  /** 结构化选项——给选项不给作文题；用户也可自由输入 */
  options: string[]
  allowFreeText: boolean
}

export interface AgentPlan {
  /** 用户的原始目标（一句话） */
  goal: string
  createdAt: number
  steps: PlanStep[]
  /** 当前待决检查点（null = 没有悬置决策） */
  pendingCheckpoint: { stepId: string; type: CheckpointType; clarify?: ClarifyRequest } | null
}

export type RunStatus =
  | 'idle' // 没有 run
  | 'running' // agent 正在自主执行
  | 'paused-checkpoint' // 停在检查点等人
  | 'completed' // 全部步骤完成
  | 'failed' // 预算耗尽或连续失败
  | 'stopped' // 用户主动停止

export interface AgentRunState {
  status: RunStatus
  /** 本次 run 已消耗的 agent turn 数（预算护栏） */
  turnsUsed: number
  /** 当前正在执行的 step id */
  currentStepId: string | null
}

export const RUN_TURN_BUDGET = 30

// ── 标准计划模板 ──
// 四阶段流水线的默认展开。AI 的 propose_plan 可以改标题/增删 auto 步，
// 但 checkpoint 骨架由引擎兜底（见 normalizePlan），保证"人看管"的点位不丢。

let stepSeq = 0
function sid(prefix: string): string {
  return `${prefix}-${++stepSeq}-${Date.now().toString(36)}`
}

export function createDefaultPlan(goal: string): AgentPlan {
  stepSeq = 0
  return {
    goal,
    createdAt: Date.now(),
    pendingCheckpoint: null,
    steps: [
      { id: sid('brief'), title: '澄清需求，产出 Idea Brief', phase: 'idea', kind: 'auto', status: 'pending' },
      { id: sid('spec'), title: '拆解 Spec（页面 / 组件 / 交互）', phase: 'spec', kind: 'auto', status: 'pending' },
      { id: sid('approve'), title: '确认 Spec', phase: 'spec', kind: 'checkpoint', checkpointType: 'approve-spec', status: 'pending' },
      { id: sid('design'), title: '按 Spec 渲染设计到画布', phase: 'design', kind: 'auto', status: 'pending' },
      { id: sid('export'), title: '导出前端代码（Vue / React）', phase: 'dev', kind: 'auto', status: 'pending' },
      { id: sid('selfcheck'), title: '交付前自检', phase: 'dev', kind: 'auto', action: 'self-check', status: 'pending' },
      { id: sid('accept'), title: '验收交付', phase: 'dev', kind: 'checkpoint', checkpointType: 'accept-delivery', status: 'pending' },
    ],
  }
}

const VALID_PHASES: PipelinePhase[] = ['idea', 'spec', 'design', 'dev']
const VALID_CHECKPOINTS: CheckpointType[] = ['clarify', 'approve-spec', 'accept-delivery']

/** 归一化单个步骤：垃圾字段降级为安全默认，无效步骤返回 null */
function normalizeStep(raw: Partial<PlanStep>): PlanStep | null {
  if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) return null
  const phase = raw.phase && VALID_PHASES.includes(raw.phase) ? raw.phase : 'idea'
  const isCheckpoint = raw.kind === 'checkpoint'
  const checkpointType =
    isCheckpoint && raw.checkpointType && VALID_CHECKPOINTS.includes(raw.checkpointType)
      ? raw.checkpointType
      : undefined
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : sid('step'),
    title: raw.title.trim(),
    phase,
    kind: isCheckpoint && checkpointType ? 'checkpoint' : 'auto',
    checkpointType,
    action: raw.action === 'self-check' ? 'self-check' : undefined,
    status: 'pending',
  }
}

/** 补一个"人看管"检查点步骤 */
function checkpointStep(prefix: string, title: string, phase: PipelinePhase, type: CheckpointType): PlanStep {
  return { id: sid(prefix), title, phase, kind: 'checkpoint', checkpointType: type, status: 'pending' }
}

/**
 * 校验/兜底 AI 产出的计划：checkpoint 类型必须合法，步骤必须落到已知阶段。
 * AI 没给检查点时自动补 approve-spec 和 accept-delivery——
 * "人看管和决策"的点位不允许被模型省略。
 */
export function normalizePlan(
  plan: (Omit<Partial<AgentPlan>, 'steps'> & { steps?: Array<Partial<PlanStep>> }) | null | undefined,
  goalFallback = '',
): AgentPlan | null {
  if (!plan || !Array.isArray(plan.steps) || plan.steps.length === 0) return null

  const steps = plan.steps.map(normalizeStep).filter((s): s is PlanStep => s !== null)
  if (steps.length === 0) return null

  // 兜底：spec 之后没有 approve-spec 检查点就补上；dev 末尾没有 accept-delivery 也补上
  const hasApprove = steps.some((s) => s.checkpointType === 'approve-spec')
  const hasAccept = steps.some((s) => s.checkpointType === 'accept-delivery')
  if (!hasApprove) {
    const lastSpecIdx = steps.map((s) => s.phase).lastIndexOf('spec')
    steps.splice(lastSpecIdx + 1, 0, checkpointStep('approve', '确认 Spec', 'spec', 'approve-spec'))
  }
  if (!hasAccept) {
    steps.push(checkpointStep('accept', '验收交付', 'dev', 'accept-delivery'))
  }

  return {
    goal: typeof plan.goal === 'string' && plan.goal.trim() ? plan.goal.trim() : goalFallback,
    createdAt: typeof plan.createdAt === 'number' ? plan.createdAt : Date.now(),
    steps,
    pendingCheckpoint: plan.pendingCheckpoint ?? null,
  }
}
