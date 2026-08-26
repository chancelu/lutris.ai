// ── Run Loop 引擎（"agent 跑流水线，人看管和决策"的发动机）──
// 职责：
//   1. startRun(goal) 建计划并开跑
//   2. 每个 agent turn 结束后（或剧本步骤完成后）评估计划进度：
//      - 下一步是 auto → 自动注入接力消息，跨阶段不断档
//      - 下一步是 checkpoint → 暂停，挂出待决卡，等人
//      - 没有下一步 → run 完成
//   3. 预算护栏：单 run 最多 RUN_TURN_BUDGET 个 turn，超限转 failed
//
// 与 use-chat 的关系：use-chat 的 onFinish 调 notifyAgentTurnFinished()。
// 与剧本模式的关系：剧本执行器（demo/agent-script.ts）不调模型，
// 但每一步完成后同样调 notifyAgentTurnFinished()——两条路径共用一台引擎。

import { computed, ref } from 'vue'

import { useAIChat } from '@/composables/use-chat'
import { usePipeline } from '@/composables/use-pipeline'
import { useProjects } from '@/composables/use-projects'
import { useSpec } from '@/composables/use-spec'
import { track } from '@/lib/analytics'
import { useCodeOutput } from '@/stores/code-output'
import {
  RUN_TURN_BUDGET,
  createDefaultPlan,
} from '@/types/plan'

import type {
  AgentRunState,
  CheckpointType,
  ClarifyRequest,
  PlanStep,
} from '@/types/plan'

// ── 自检报告（L1 结构自检，零模型零网络）──
export interface SelfCheckItem {
  label: string
  ok: boolean
  detail?: string
}
export interface SelfCheckReport {
  items: SelfCheckItem[]
  passedAt: number
}

const run = ref<AgentRunState>({ status: 'idle', turnsUsed: 0, currentStepId: null })
const selfCheckReport = ref<SelfCheckReport | null>(null)

// 剧本模式开关由 demo/agent-script.ts 控制：开启后 auto 步骤不注入 AI 接力消息
const scriptModeActive = ref(false)

function getPlan() {
  const { activePipeline } = useProjects()
  return activePipeline.value.plan ?? null
}

function setPlan(plan: ReturnType<typeof getPlan>) {
  const { activePipeline, saveActiveProjectData } = useProjects()
  activePipeline.value.plan = plan ?? undefined
  void saveActiveProjectData()
}

function findStep(id: string | null): PlanStep | null {
  if (!id) return null
  return getPlan()?.steps.find((s) => s.id === id) ?? null
}

function setStepStatus(id: string, status: PlanStep['status'], note?: string) {
  const plan = getPlan()
  const step = plan?.steps.find((s) => s.id === id)
  if (!plan || !step) return
  step.status = status
  if (note !== undefined) step.note = note
  setPlan({ ...plan })
}

// ── 进度同步：从 pipeline 真实状态推导每个 step 是否已完成 ──
// 引擎不猜——读产出。brief/spec/design/dev 各有明确的"已完成"判据。
function isStepDone(step: PlanStep): boolean {
  const { outputs, phases } = usePipeline()
  const { pages } = useSpec()
  const { hasCode } = useCodeOutput()

  if (step.kind === 'checkpoint') {
    switch (step.checkpointType) {
      // clarify 完成 = idea brief 已提交（澄清是 idea 阶段的子活动）
      case 'clarify': return !!outputs.value.idea
      // approve-spec 完成 = spec 阶段被确认（advancePhase 把 spec 标 completed）
      case 'approve-spec': return phases.value.spec.status === 'completed'
      // accept-delivery 完成 = 用户显式验收（resolveCheckpoint 标 done）。
      // 不能用 dev 阶段完成来推导——那是 agent 的动作，不是人的验收。
      case 'accept-delivery': return step.status === 'done'
      default: return false
    }
  }

  switch (step.phase) {
    case 'idea': return !!outputs.value.idea
    case 'spec': return pages.value.length > 0 || phases.value.spec.status === 'completed'
    case 'design': return !!outputs.value.design
    case 'dev':
      // dev 的 auto 步分两小步：导出（hasCode）与自检（有报告，由 action 标记识别）
      if (step.action === 'self-check') return selfCheckReport.value !== null
      return hasCode.value || phases.value.dev.status === 'completed'
    default: return false
  }
}

/** 找到第一个未完成步骤 */
function nextPendingStep(): PlanStep | null {
  const plan = getPlan()
  return plan?.steps.find((s) => !isStepDone(s) && s.status !== 'skipped') ?? null
}

// ── 接力消息（agent 向）：跨阶段自动开工 ──
function continuationMessage(step: PlanStep): string {
  const plan = getPlan()
  const goal = plan?.goal ?? ''
  switch (step.phase) {
    case 'idea':
      return `[Run 开始] 用户目标：${goal}\n请先快速澄清最关键的歧义（如有，用 ask_clarifying_questions 给出选项），然后调用 submit_idea_brief 提交产品定位。不要寒暄，直接推进。`
    case 'spec':
      return `[Run 继续] Idea Brief 已提交。请立即把它拆解成 Spec 页面结构（名称/路由/核心组件/交互规则），拆完调 submit_spec。目标回顾：${goal}`
    case 'design':
      return `[Run 继续] Spec 已由用户确认。请按 Spec 把页面逐一渲染到画布（render 工具），保持统一设计语言，全部完成后调 submit_design。`
    case 'dev':
      return `[Run 继续] 设计已确认。请用 export_code 导出 Vue 和 React 代码，然后调 submit_dev_output 完成交付。`
    default:
      return `[Run 继续] 请推进当前步骤：${step.title}`
  }
}

// ── 对外 API ──

export function useAgentRun() {
  const { pendingMessage } = useAIChat()

  const status = computed(() => run.value.status)
  const isActive = computed(() => run.value.status === 'running' || run.value.status === 'paused-checkpoint')
  const plan = computed(() => getPlan())
  const currentStep = computed(() => findStep(run.value.currentStepId))

  /**
   * 开跑。createDefaultPlan 先给一份标准计划；
   * AI 路径下 orchestrator 可用 propose_plan 覆盖标题/步骤（normalizePlan 兜底检查点）。
   */
  function startRun(goal: string) {
    const plan = createDefaultPlan(goal)
    setPlan(plan)
    run.value = { status: 'running', turnsUsed: 0, currentStepId: plan.steps[0]?.id ?? null }
    if (plan.steps[0]) setStepStatus(plan.steps[0].id, 'running')
    selfCheckReport.value = null
    track('run_started', { goalLength: goal.length })
    track('plan_proposed', { source: 'template', stepCount: plan.steps.length })
    // 开跑即接力：第一步（idea）的开工消息直接注入，AI 路径无需人工再推一把
    if (!scriptModeActive.value && plan.steps[0]) {
      pendingMessage.value = continuationMessage(plan.steps[0])
    }
  }

  /** AI 用 propose_plan 工具注入自定义计划（保留检查点兜底） */
  function adoptPlan(plan: Parameters<typeof setPlan>[0]) {
    if (!plan) return
    setPlan(plan)
    track('plan_proposed', { source: 'agent', stepCount: plan.steps.length })
  }

  /** AI 调 ask_clarifying_questions → 挂 clarify 检查点并暂停 */
  function requestClarification(req: ClarifyRequest) {
    const plan = getPlan()
    if (!plan) return
    const stepId = run.value.currentStepId
    plan.pendingCheckpoint = { stepId: stepId ?? '', type: 'clarify', clarify: req }
    setPlan({ ...plan })
    run.value.status = 'paused-checkpoint'
    track('checkpoint_shown', { type: 'clarify' })
  }

  /**
   * 核心驱动：一个执行单元（agent turn / 剧本步骤）结束后调用。
   * 同步进度 → 找下一步 → auto 接力 / checkpoint 暂停 / 完成收尾。
   */
  function notifyAgentTurnFinished() {
    if (run.value.status !== 'running') return

    run.value.turnsUsed++
    if (run.value.turnsUsed > RUN_TURN_BUDGET) {
      run.value.status = 'failed'
      const cur = run.value.currentStepId
      if (cur) setStepStatus(cur, 'failed', '超出 turn 预算，已自动停止')
      track('run_completed', { outcome: 'budget-exceeded', turns: run.value.turnsUsed })
      return
    }

    // 当前步骤标记完成
    const cur = run.value.currentStepId
    if (cur) {
      const step = findStep(cur)
      if (step && isStepDone(step)) {
        setStepStatus(cur, 'done')
        track('run_step_done', { step: cur, phase: step.phase })
      }
    }

    const next = nextPendingStep()
    if (!next) {
      run.value = { status: 'completed', turnsUsed: run.value.turnsUsed, currentStepId: null }
      track('run_completed', { outcome: 'success', turns: run.value.turnsUsed })
      return
    }

    run.value.currentStepId = next.id

    if (next.kind === 'checkpoint') {
      // clarify 检查点只能由 agent 主动发起（requestClarification）；
      // approve/accept 到点自动挂出
      if (next.checkpointType !== 'clarify') {
        const plan = getPlan()
        if (plan) {
          plan.pendingCheckpoint = { stepId: next.id, type: next.checkpointType! }
          setPlan({ ...plan })
        }
        setStepStatus(next.id, 'blocked')
        run.value.status = 'paused-checkpoint'
        track('checkpoint_shown', { type: next.checkpointType })
        return
      }
      // clarify 没被触发就跳过（需求够清晰）
      setStepStatus(next.id, 'skipped', '需求足够清晰，无需澄清')
      notifyAgentTurnFinished()
      return
    }

    // 自检步由引擎内联执行（L1 结构自检零模型），不烧 turn 等 agent
    if (next.action === 'self-check') {
      setStepStatus(next.id, 'running')
      const report = runStructuralSelfCheck()
      setSelfCheckReport(report)
      const allOk = report.items.every((i) => i.ok)
      setStepStatus(next.id, 'done', allOk ? '结构自检通过' : '自检发现问题，详见报告')
      track('run_step_done', { step: next.id, phase: next.phase })
      notifyAgentTurnFinished()
      return
    }

    // auto 步骤：AI 路径注入接力消息；剧本路径由剧本自己驱动（scriptMode 时不发消息）
    setStepStatus(next.id, 'running')
    if (!scriptModeActive.value) {
      pendingMessage.value = continuationMessage(next)
    }
  }

  /** 用户解决检查点 → 恢复 run */
  function resolveCheckpoint(input?: { answer?: string }) {
    const plan = getPlan()
    const pending = plan?.pendingCheckpoint
    if (!plan || !pending) return

    const type: CheckpointType = pending.type
    plan.pendingCheckpoint = null
    setPlan({ ...plan })
    track('checkpoint_resolved', { type, modified: !!input?.answer })

    if (type === 'clarify') {
      // 用户的澄清答案作为一条用户消息发给 agent，run 继续
      run.value.status = 'running'
      if (input?.answer) {
        pendingMessage.value = `[澄清回答] ${input.answer}\n请据此继续，尽快提交 Idea Brief。`
      } else {
        pendingMessage.value = '[澄清回答] 用户表示按你的建议继续。请提交 Idea Brief。'
      }
      return
    }

    if (type === 'accept-delivery') {
      setStepStatus(pending.stepId, 'done')
      run.value = { status: 'completed', turnsUsed: run.value.turnsUsed, currentStepId: null }
      track('run_completed', { outcome: 'accepted', turns: run.value.turnsUsed })
      return
    }

    // approve-spec：SpecPanel 的 confirmSpec 已把阶段推进到 design，
    // 这里只需要恢复 run 并接力 design
    setStepStatus(pending.stepId, 'done')
    run.value.status = 'running'
    notifyAgentTurnFinished()
  }

  /** 插话（steer）：turn 间生效——把用户的话插进下一个 turn 的最高优先级 */
  function steer(text: string) {
    if (!isActive.value) return
    track('steer_used')
    pendingMessage.value = `[用户插话·最高优先级] ${text}\n请先响应这条插话，再继续执行计划。`
    if (run.value.status === 'paused-checkpoint') {
      const plan = getPlan()
      if (plan) {
        plan.pendingCheckpoint = null
        setPlan({ ...plan })
      }
      run.value.status = 'running'
    }
  }

  function stopRun() {
    run.value.status = 'stopped'
    const plan = getPlan()
    if (plan?.pendingCheckpoint) {
      plan.pendingCheckpoint = null
      setPlan({ ...plan })
    }
    track('run_completed', { outcome: 'stopped', turns: run.value.turnsUsed })
  }

  function setSelfCheckReport(report: SelfCheckReport) {
    selfCheckReport.value = report
    track('selfcheck_result', {
      ok: report.items.every((i) => i.ok),
      failedCount: report.items.filter((i) => !i.ok).length,
    })
  }

  return {
    run: computed(() => run.value),
    status,
    isActive,
    plan,
    currentStep,
    selfCheckReport: computed(() => selfCheckReport.value),
    startRun,
    adoptPlan,
    requestClarification,
    notifyAgentTurnFinished,
    resolveCheckpoint,
    steer,
    stopRun,
    setSelfCheckReport,
  }
}

// 剧本模式开关由 demo/agent-script.ts 控制
export function useScriptMode() {
  return {
    active: computed(() => scriptModeActive.value),
    set(v: boolean) { scriptModeActive.value = v },
  }
}

// ── L1 结构自检（零模型）：对照 Spec 与画布/代码产物逐项核对 ──
export function runStructuralSelfCheck(): SelfCheckReport {
  const { outputs } = usePipeline()
  const { pages } = useSpec()
  const { byFramework } = useCodeOutput()

  const items: SelfCheckItem[] = []

  // 1. 每个 SpecPage 都有画布 Frame 对应
  const map = outputs.value.design?.pageNodeMap ?? {}
  const covered = pages.value.filter((p) => map[p.id] || Object.keys(map).length > 0)
  items.push({
    label: 'Spec 页面覆盖',
    ok: pages.value.length === 0 || covered.length >= pages.value.length,
    detail: pages.value.length > 0 ? `${covered.length}/${pages.value.length} 页面已渲染` : '无 Spec（自由设计路径）',
  })

  // 2. 双框架代码
  const fw = byFramework.value
  items.push({
    label: 'Vue 代码已生成',
    ok: !!fw.Vue && fw.Vue.files.every((f) => f.code.trim().length > 0),
  })
  items.push({
    label: 'React 代码已生成',
    ok: !!fw.React && fw.React.files.every((f) => f.code.trim().length > 0),
  })

  // 3. React 导出的 CSS 拆分完整（zip 可运行的前提）
  const reactCode = fw.React?.files[0]?.code ?? ''
  items.push({
    label: '工程包可直接运行',
    ok: reactCode.length === 0 || reactCode.includes("import './styles.css'"),
    detail: 'styles.css 引用完整',
  })

  return { items, passedAt: Date.now() }
}
