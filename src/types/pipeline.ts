// ── Pipeline State Machine（PRD 多 agent orchestrator 架构）──
// 驱动 Idea → Spec → Design → Dev 的线性阶段路由。
// Orchestrator（use-pipeline.ts）读写这里的状态来决定：
//   1. 当前该用哪个 phase agent 的 system prompt + 工具白名单（见 ai/tools.ts）
//   2. 该阶段的产出是否合法，能不能推进到下一阶段
// 这个文件只定义数据结构，不含任何业务逻辑（校验/推进逻辑在 use-pipeline.ts）。

export type PipelinePhase = 'idea' | 'spec' | 'design' | 'dev'

export const PIPELINE_PHASES: readonly PipelinePhase[] = ['idea', 'spec', 'design', 'dev']

export type PipelinePhaseStatus = 'pending' | 'in-progress' | 'completed' | 'skipped'

export interface PipelinePhaseState {
  status: PipelinePhaseStatus
  enteredAt?: number
  completedAt?: number
  /** 该阶段校验失败次数，用于给用户提示"卡在这个阶段很久了" */
  validationFailCount: number
}

export type PipelineTransitionReason =
  | 'agent-advance' // orchestrator 校验产出合法，自动推进
  | 'user-override' // 用户手动跳转阶段（如直接点 Design tab）
  | 'validation-fail-revert' // 产出校验失败，退回上一阶段
  | 'init' // 初始化

export interface PipelineTransition {
  from: PipelinePhase | null
  to: PipelinePhase
  timestamp: number
  reason: PipelineTransitionReason
  /** 校验失败时记录原因，供调试/用户提示 */
  note?: string
}

// ── 各阶段产出契约 ──
// 每个 phase agent 的结构化产出必须匹配对应类型，orchestrator 才允许推进。

/** Idea 阶段产出：结构化的产品简报，供 Spec 阶段消费 */
export interface IdeaBrief {
  /** 一句话产品定位 */
  summary: string
  /** 目标用户 */
  targetUsers: string
  /** 核心问题/痛点 */
  problem: string
  /** 关键决策点（Agent 反问用户确认的内容），如 ["单人模式 or 多人协作", "web only or 也要 desktop"] */
  keyDecisions: string[]
}

/** Spec 阶段产出：引用 src/types/spec.ts 的 SpecDocument（避免循环依赖，这里只存引用 id） */
export interface SpecPhaseOutput {
  specDocumentId: string
}

/** Design 阶段产出：已经渲染到画布上的页面 node id 列表 */
export interface DesignPhaseOutput {
  /** 每个 SpecPage.id → 画布上对应 Frame 的 node id */
  pageNodeMap: Record<string, string>
  renderedAt: number
}

/** Dev 阶段产出：代码导出结果 */
export interface DevPhaseOutput {
  frameworks: Array<'vue' | 'react'>
  exportedAt: number
}

export interface PipelineOutputs {
  idea?: IdeaBrief
  spec?: SpecPhaseOutput
  design?: DesignPhaseOutput
  dev?: DevPhaseOutput
}

// ── 完整 Pipeline 状态（持久化进 ProjectData.pipeline）──

export interface PipelineState {
  currentPhase: PipelinePhase
  phases: Record<PipelinePhase, PipelinePhaseState>
  outputs: PipelineOutputs
  history: PipelineTransition[]
}

// ── Factory ──

function createEmptyPhaseState(): PipelinePhaseState {
  return { status: 'pending', validationFailCount: 0 }
}

export function createEmptyPipelineState(): PipelineState {
  const now = Date.now()
  return {
    currentPhase: 'idea',
    phases: {
      idea: { ...createEmptyPhaseState(), status: 'in-progress', enteredAt: now },
      spec: createEmptyPhaseState(),
      design: createEmptyPhaseState(),
      dev: createEmptyPhaseState(),
    },
    outputs: {},
    history: [{ from: null, to: 'idea', timestamp: now, reason: 'init' }],
  }
}

/** 阶段在 PIPELINE_PHASES 中的顺序索引，用于判断"是否允许跳到这一阶段" */
export function phaseIndex(phase: PipelinePhase): number {
  return PIPELINE_PHASES.indexOf(phase)
}


/**
 * 兼容恢复：IDB 里旧版本存的 pipeline 可能缺 phases 的某些 key（或整个 phases/history），
 * 直接挂到 activePipeline 上会让 PipelinePhaseStepper 等消费方在渲染时抛
 * "Cannot read properties of undefined (reading 'status')"。这里以默认空状态为底做合并，
 * 缺失的 phase 补 pending，未识别的 currentPhase 回退到 idea。
 */
export function normalizePipelineState(saved: Partial<PipelineState> | null | undefined): PipelineState {
  const base = createEmptyPipelineState()
  if (!saved || typeof saved !== 'object') return base

  const phases = { ...base.phases }
  for (const phase of PIPELINE_PHASES) {
    const s = saved.phases?.[phase]
    if (s && typeof s === 'object') {
      phases[phase] = { ...createEmptyPhaseState(), ...s }
    }
  }

  const currentPhase = PIPELINE_PHASES.includes(saved.currentPhase as PipelinePhase)
    ? (saved.currentPhase as PipelinePhase)
    : 'idea'

  return {
    currentPhase,
    phases,
    outputs: saved.outputs && typeof saved.outputs === 'object' ? saved.outputs : {},
    history: Array.isArray(saved.history) && saved.history.length > 0 ? saved.history : base.history,
  }
}
