/**
 * Agent 化 v1 unit tests — Run Loop 引擎（use-agent-run）+ Plan 模型（types/plan）。
 *
 * 核心圣经："agent 跑流水线，人看管和决策"。这些测试锁定：
 * - normalizePlan 的检查点兜底（模型不许省掉人的决策点）
 * - startRun 建计划并自动开工（注入第一条接力消息）
 * - notifyAgentTurnFinished 的三种走向：auto 接力 / checkpoint 暂停 / 完成
 * - 自检步由引擎内联执行（不烧 turn、不等模型）
 * - accept-delivery 只能由人显式验收关闭（dev 完成 ≠ 人验收）
 * - turn 预算护栏
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { runStructuralSelfCheck, useAgentRun, useScriptMode } from '@/composables/use-agent-run'
import { useAIChat } from '@/composables/use-chat'
import { usePipeline } from '@/composables/use-pipeline'
import { useProjects } from '@/composables/use-projects'
import { useSpec } from '@/composables/use-spec'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import { createEmptyPipelineState } from '@/types/pipeline'
import { RUN_TURN_BUDGET, createDefaultPlan, normalizePlan } from '@/types/plan'

import type { PlanStep } from '@/types/plan'

function resetAll() {
  setActiveEditorStore(createEditorStore())
  const { activePipeline } = useProjects()
  activePipeline.value = createEmptyPipelineState()
  useSpec().replacePages([], 'user', 'reset')
  useAgentRun().stopRun()
  useScriptMode().set(false)
  useAIChat().pendingMessage.value = null
}

function startFreshRun(goal = '做一个记账 SaaS 落地页') {
  const agentRun = useAgentRun()
  agentRun.startRun(goal)
  return agentRun
}

/** 把 pipeline 推进到指定阶段并给出合法产出（模拟 agent/剧本已干活） */
function markPhaseOutput(phase: 'idea' | 'spec' | 'design' | 'dev') {
  const { activePipeline } = useProjects()
  const p = activePipeline.value
  if (phase === 'idea') {
    p.outputs.idea = { summary: 's', targetUsers: 'u', problem: 'p', keyDecisions: [] }
  } else if (phase === 'spec') {
    const spec = useSpec()
    spec.upsertPage(spec.createSpecPage('落地页', { route: '/', purpose: '转化', userStory: 'u' }), 'ai', 'test')
  } else if (phase === 'design') {
    p.outputs.design = { pageNodeMap: { p1: 'n1' }, renderedAt: Date.now() }
  } else {
    p.phases.dev.status = 'completed'
    p.outputs.dev = { frameworks: ['vue', 'react'], exportedAt: Date.now() }
  }
}

describe('normalizePlan', () => {
  it('returns null for empty or invalid plans', () => {
    expect(normalizePlan(null)).toBeNull()
    expect(normalizePlan({ steps: [] })).toBeNull()
    expect(normalizePlan({ steps: [{ title: '  ' }] })).toBeNull()
  })

  it('appends human checkpoints the model omitted', () => {
    const plan = normalizePlan({
      goal: 'g',
      steps: [
        { title: '拆解 Spec', phase: 'spec', kind: 'auto' },
        { title: '导出代码', phase: 'dev', kind: 'auto' },
      ],
    })
    expect(plan).not.toBeNull()
    const checkpoints = plan!.steps.filter((s) => s.kind === 'checkpoint')
    expect(checkpoints.map((s) => s.checkpointType)).toEqual(['approve-spec', 'accept-delivery'])
    // approve-spec 插在最后一个 spec 步之后
    const approveIdx = plan!.steps.findIndex((s) => s.checkpointType === 'approve-spec')
    expect(plan!.steps[approveIdx - 1].phase).toBe('spec')
  })

  it('keeps valid checkpoints and sanitizes garbage fields', () => {
    const plan = normalizePlan({
      goal: 'g',
      steps: [
        { title: '确认 Spec', phase: 'spec', kind: 'checkpoint', checkpointType: 'approve-spec' },
        { title: '坏步骤', phase: 'mars' as never, kind: 'checkpoint', checkpointType: 'nope' as never },
        { title: '验收交付', phase: 'dev', kind: 'checkpoint', checkpointType: 'accept-delivery' },
      ],
    })
    expect(plan!.steps).toHaveLength(3)
    // 坏步骤降级为 auto + phase 归一到 idea；合法检查点原样保留
    expect(plan!.steps[1].kind).toBe('auto')
    expect(plan!.steps[1].phase).toBe('idea')
    expect(plan!.steps.filter((s) => s.kind === 'checkpoint')).toHaveLength(2)
  })
})

describe('Run Loop 引擎', () => {
  beforeEach(resetAll)

  it('startRun 建默认计划、开跑并注入第一条接力消息', () => {
    const agentRun = startFreshRun()
    expect(agentRun.status.value).toBe('running')
    expect(agentRun.plan.value?.goal).toBe('做一个记账 SaaS 落地页')
    expect(agentRun.plan.value?.steps).toHaveLength(7)
    expect(agentRun.currentStep.value?.phase).toBe('idea')
    expect(agentRun.currentStep.value?.status).toBe('running')
    expect(useAIChat().pendingMessage.value).toContain('[Run 开始]')
    expect(useAIChat().pendingMessage.value).toContain('做一个记账 SaaS 落地页')
  })

  it('剧本模式下 startRun 不注入接力消息（剧本自己驱动）', () => {
    useScriptMode().set(true)
    startFreshRun()
    expect(useAIChat().pendingMessage.value).toBeNull()
  })

  it('auto 步完成后自动接力到下一 auto 步', () => {
    const agentRun = startFreshRun()
    markPhaseOutput('idea')
    agentRun.notifyAgentTurnFinished()

    const steps = agentRun.plan.value!.steps
    expect(steps[0].status).toBe('done')
    expect(agentRun.currentStep.value?.phase).toBe('spec')
    expect(agentRun.status.value).toBe('running')
    expect(useAIChat().pendingMessage.value).toContain('[Run 继续]')
  })

  it('到 approve-spec 检查点自动暂停，挂出待决卡', () => {
    const agentRun = startFreshRun()
    markPhaseOutput('idea')
    agentRun.notifyAgentTurnFinished()
    markPhaseOutput('spec')
    agentRun.notifyAgentTurnFinished()

    expect(agentRun.status.value).toBe('paused-checkpoint')
    expect(agentRun.plan.value?.pendingCheckpoint?.type).toBe('approve-spec')
    // 暂停时不注入新消息——等人
    expect(agentRun.currentStep.value?.checkpointType).toBe('approve-spec')
  })

  it('人确认 spec 后 run 恢复并接力 design', () => {
    const agentRun = startFreshRun()
    markPhaseOutput('idea')
    agentRun.notifyAgentTurnFinished()
    markPhaseOutput('spec')
    agentRun.notifyAgentTurnFinished()
    // 模拟 SpecPanel.confirmSpec：先 advancePhase 再 resolveCheckpoint
    useProjects().activePipeline.value.currentPhase = 'spec'
    usePipeline().advancePhase('spec', { specDocumentId: 'p1' })
    agentRun.resolveCheckpoint()

    expect(agentRun.status.value).toBe('running')
    expect(agentRun.currentStep.value?.phase).toBe('design')
    expect(useAIChat().pendingMessage.value).toContain('Spec 已由用户确认')
  })

  it('自检步由引擎内联完成，随后停在 accept-delivery 等人验收', () => {
    const agentRun = startFreshRun()
    markPhaseOutput('idea')
    agentRun.notifyAgentTurnFinished()
    markPhaseOutput('spec')
    agentRun.notifyAgentTurnFinished()
    useProjects().activePipeline.value.currentPhase = 'spec'
    usePipeline().advancePhase('spec', { specDocumentId: 'p1' })
    agentRun.resolveCheckpoint()

    markPhaseOutput('design')
    agentRun.notifyAgentTurnFinished() // → export 步
    expect(agentRun.currentStep.value?.title).toContain('导出')

    markPhaseOutput('dev')
    const turnsBefore = agentRun.run.value.turnsUsed
    agentRun.notifyAgentTurnFinished() // → 自检步内联执行 → accept 检查点

    // 自检已完成且报告已生成（内联，不等 agent）
    const selfcheck = agentRun.plan.value!.steps.find((s) => s.action === 'self-check')
    expect(selfcheck?.status).toBe('done')
    expect(agentRun.selfCheckReport.value).not.toBeNull()
    // 内联自检只烧 1 个递归 turn，且最终停在验收检查点
    expect(agentRun.run.value.turnsUsed).toBeLessThanOrEqual(turnsBefore + 2)
    expect(agentRun.status.value).toBe('paused-checkpoint')
    expect(agentRun.plan.value?.pendingCheckpoint?.type).toBe('accept-delivery')
  })

  it('dev 完成 ≠ 人验收：accept-delivery 只能由 resolveCheckpoint 关闭', () => {
    const agentRun = startFreshRun()
    markPhaseOutput('idea')
    agentRun.notifyAgentTurnFinished()
    markPhaseOutput('spec')
    agentRun.notifyAgentTurnFinished()
    useProjects().activePipeline.value.currentPhase = 'spec'
    usePipeline().advancePhase('spec', { specDocumentId: 'p1' })
    agentRun.resolveCheckpoint()
    markPhaseOutput('design')
    agentRun.notifyAgentTurnFinished()
    markPhaseOutput('dev')
    agentRun.notifyAgentTurnFinished()

    // dev 阶段已 completed，但 run 仍停在验收检查点（不是 completed）
    expect(usePipeline().phases.value.dev.status).toBe('completed')
    expect(agentRun.status.value).toBe('paused-checkpoint')

    agentRun.resolveCheckpoint()
    expect(agentRun.status.value).toBe('completed')
    const accept = agentRun.plan.value!.steps.find((s) => s.checkpointType === 'accept-delivery')
    expect(accept?.status).toBe('done')
  })

  it('clarify 检查点：agent 主动挂起，用户回答后带着答案恢复', () => {
    const agentRun = startFreshRun()
    agentRun.requestClarification({
      question: '单人模式还是多人协作？',
      options: ['单人', '协作'],
      allowFreeText: true,
    })
    expect(agentRun.status.value).toBe('paused-checkpoint')
    expect(agentRun.plan.value?.pendingCheckpoint?.clarify?.question).toContain('单人')

    agentRun.resolveCheckpoint({ answer: '单人模式' })
    expect(agentRun.status.value).toBe('running')
    expect(useAIChat().pendingMessage.value).toContain('单人模式')
  })

  it('turn 预算耗尽自动 failed，当前步骤标记原因', () => {
    const agentRun = startFreshRun()
    // 第一步永远完不成（没有产出），每次 notify 都原地接力
    for (let i = 0; i < RUN_TURN_BUDGET + 1; i++) {
      agentRun.notifyAgentTurnFinished()
    }
    expect(agentRun.status.value).toBe('failed')
    const briefStep = agentRun.plan.value!.steps[0]
    expect(briefStep.status).toBe('failed')
    expect(briefStep.note).toContain('预算')
  })

  it('stopRun 主动停止并清掉悬置检查点', () => {
    const agentRun = startFreshRun()
    markPhaseOutput('idea')
    agentRun.notifyAgentTurnFinished()
    markPhaseOutput('spec')
    agentRun.notifyAgentTurnFinished()
    expect(agentRun.status.value).toBe('paused-checkpoint')

    agentRun.stopRun()
    expect(agentRun.status.value).toBe('stopped')
    expect(agentRun.plan.value?.pendingCheckpoint).toBeNull()
  })
})

describe('runStructuralSelfCheck（L1）', () => {
  beforeEach(resetAll)

  it('无代码时 Vue/React 项不通过；有 spec 无画布时覆盖项不通过', () => {
    const spec = useSpec()
    spec.upsertPage(spec.createSpecPage('落地页', { route: '/' }), 'ai', 'test')
    const report = runStructuralSelfCheck()
    const byLabel = Object.fromEntries(report.items.map((i) => [i.label, i.ok]))
    expect(byLabel['Vue 代码已生成']).toBe(false)
    expect(byLabel['React 代码已生成']).toBe(false)
    expect(byLabel['Spec 页面覆盖']).toBe(false)
  })

  it('无 spec（自由设计路径）时覆盖项直接通过', () => {
    const report = runStructuralSelfCheck()
    const coverage = report.items.find((i) => i.label === 'Spec 页面覆盖')
    expect(coverage?.ok).toBe(true)
  })
})

describe('createDefaultPlan', () => {
  it('包含两个人看管检查点，步骤落在正确阶段', () => {
    const plan = createDefaultPlan('目标')
    const kinds: Array<[PlanStep['phase'], PlanStep['kind']]> = plan.steps.map((s) => [s.phase, s.kind])
    expect(kinds).toEqual([
      ['idea', 'auto'],
      ['spec', 'auto'],
      ['spec', 'checkpoint'],
      ['design', 'auto'],
      ['dev', 'auto'],
      ['dev', 'auto'],
      ['dev', 'checkpoint'],
    ])
    expect(plan.steps.find((s) => s.title === '交付前自检')?.action).toBe('self-check')
  })
})
