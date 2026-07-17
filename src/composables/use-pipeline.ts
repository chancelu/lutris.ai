// ── Pipeline Orchestrator（PRD 多 agent 架构核心）──
// 驱动 Idea → Spec → Design → Dev 的线性阶段路由。
// 状态本身存在 useProjects().activePipeline（Task 8 已接入 IDB 持久化），
// 这个 composable 只是这份状态之上的"操作 + 校验"逻辑层，不重复持有状态。
//
// Task 10 会在这里的基础上，让 use-chat.ts 根据 currentPhase 选择
// 对应 phase agent 的 system prompt + 工具白名单。这个文件本身不碰 use-chat.ts/tools.ts。

import { computed } from 'vue'

import { useProjects } from '@/composables/use-projects'
import {
  PIPELINE_PHASES,
  phaseIndex,
} from '@/types/pipeline'

import type {
  DesignPhaseOutput,
  DevPhaseOutput,
  IdeaBrief,
  PipelineOutputs,
  PipelinePhase,
  SpecPhaseOutput,
} from '@/types/pipeline'

// ── 校验结果 ──

export interface PhaseValidationResult {
  valid: boolean
  /** 校验失败原因，人类可读，用于 UI 提示 + history.note */
  reason?: string
}

// ── 各阶段产出校验器（纯函数，结构完整性级别）──
// 不做语义判断——语义质量由 phase agent 自己的 system prompt 负责，
// 这里只挡"产出根本不完整/不能用"的情况。

function validateIdeaBrief(output: IdeaBrief): PhaseValidationResult {
  if (!output.summary?.trim()) return { valid: false, reason: '缺少产品定位摘要（summary）' }
  if (!output.targetUsers?.trim()) return { valid: false, reason: '缺少目标用户（targetUsers）' }
  if (!output.problem?.trim()) return { valid: false, reason: '缺少核心问题描述（problem）' }
  return { valid: true }
}

function validateSpecOutput(output: SpecPhaseOutput): PhaseValidationResult {
  if (!output.specDocumentId?.trim()) return { valid: false, reason: '缺少 specDocumentId 引用' }
  return { valid: true }
}

function validateDesignOutput(output: DesignPhaseOutput): PhaseValidationResult {
  const pageIds = Object.keys(output.pageNodeMap ?? {})
  if (pageIds.length === 0) return { valid: false, reason: 'pageNodeMap 为空，没有任何页面被渲染到画布' }
  return { valid: true }
}

function validateDevOutput(output: DevPhaseOutput): PhaseValidationResult {
  if (!output.frameworks || output.frameworks.length === 0) {
    return { valid: false, reason: '未指定导出的框架（frameworks）' }
  }
  return { valid: true }
}

/** 按阶段分发校验，供 advancePhase 内部使用，也导出供测试直接调用 */
export function validatePhaseOutput<P extends PipelinePhase>(
  phase: P,
  output: NonNullable<PipelineOutputs[P]>
): PhaseValidationResult {
  switch (phase) {
    case 'idea': return validateIdeaBrief(output as IdeaBrief)
    case 'spec': return validateSpecOutput(output as SpecPhaseOutput)
    case 'design': return validateDesignOutput(output as DesignPhaseOutput)
    case 'dev': return validateDevOutput(output as DevPhaseOutput)
    default: return { valid: false, reason: `未知阶段: ${phase as string}` }
  }
}

// ── Orchestrator ──

export function usePipeline() {
  const { activePipeline } = useProjects()

  const currentPhase = computed(() => activePipeline.value.currentPhase)
  const phases = computed(() => activePipeline.value.phases)
  const outputs = computed(() => activePipeline.value.outputs)
  const history = computed(() => activePipeline.value.history)

  /** 用户到目前为止走到过的最远阶段（用于 jumpToPhase 的边界判断） */
  const furthestPhaseIndex = computed(() => {
    let max = 0
    for (const phase of PIPELINE_PHASES) {
      const state = activePipeline.value.phases[phase]
      if (state.status === 'completed' || state.status === 'in-progress') {
        max = Math.max(max, phaseIndex(phase))
      }
    }
    return max
  })

  function nextPhase(phase: PipelinePhase): PipelinePhase | null {
    const idx = phaseIndex(phase)
    return idx < PIPELINE_PHASES.length - 1 ? PIPELINE_PHASES[idx + 1] : null
  }

  function previousPhase(phase: PipelinePhase): PipelinePhase | null {
    const idx = phaseIndex(phase)
    return idx > 0 ? PIPELINE_PHASES[idx - 1] : null
  }

  /**
   * 提交当前阶段产出。校验通过则标记当前阶段完成、推进到下一阶段。
   * 校验失败则记录失败次数，停留原地——不是自动 revert，因为让用户/agent
   * 在同一阶段内重试通常比强制退回上一阶段更合理。
   */
  function advancePhase<P extends PipelinePhase>(
    phase: P,
    output: NonNullable<PipelineOutputs[P]>
  ): PhaseValidationResult {
    const pipeline = activePipeline.value
    if (pipeline.currentPhase !== phase) {
      return { valid: false, reason: `当前阶段是 ${pipeline.currentPhase}，不是 ${phase}，无法提交产出` }
    }

    const result = validatePhaseOutput(phase, output)
    if (!result.valid) {
      pipeline.phases[phase].validationFailCount++
      pipeline.history.push({
        from: phase,
        to: phase,
        timestamp: Date.now(),
        reason: 'validation-fail-revert',
        note: result.reason,
      })
      return result
    }

    // 记录产出
    ;(pipeline.outputs as Record<string, unknown>)[phase] = output
    pipeline.phases[phase].status = 'completed'
    pipeline.phases[phase].completedAt = Date.now()

    const next = nextPhase(phase)
    if (next) {
      pipeline.currentPhase = next
      pipeline.phases[next].status = 'in-progress'
      pipeline.phases[next].enteredAt = Date.now()
      pipeline.history.push({ from: phase, to: next, timestamp: Date.now(), reason: 'agent-advance' })
    }
    // 已经是最后一个阶段（dev）：完成后停留在 dev，不再前进

    return { valid: true }
  }

  /** 用户主动退回上一阶段重新来。当前阶段状态重置为 pending，上一阶段重新变为 in-progress。 */
  function revertPhase(note?: string): boolean {
    const pipeline = activePipeline.value
    const prev = previousPhase(pipeline.currentPhase)
    if (!prev) return false // 已经是第一阶段（idea），无法再退

    const from = pipeline.currentPhase
    pipeline.phases[from].status = 'pending'
    pipeline.phases[prev].status = 'in-progress'
    pipeline.phases[prev].enteredAt = Date.now()
    pipeline.currentPhase = prev
    pipeline.history.push({ from, to: prev, timestamp: Date.now(), reason: 'validation-fail-revert', note })
    return true
  }

  /**
   * 用户手动跳转到某阶段（如点击 Design tab）。不做产出校验，
   * 但只允许跳到"已到达过的最远阶段"以内——不能跳过未完成的阶段。
   */
  function jumpToPhase(phase: PipelinePhase): boolean {
    const pipeline = activePipeline.value
    if (phaseIndex(phase) > furthestPhaseIndex.value) return false
    if (pipeline.currentPhase === phase) return true

    const from = pipeline.currentPhase
    pipeline.currentPhase = phase
    if (pipeline.phases[phase].status === 'pending') {
      pipeline.phases[phase].status = 'in-progress'
      pipeline.phases[phase].enteredAt = Date.now()
    }
    pipeline.history.push({ from, to: phase, timestamp: Date.now(), reason: 'user-override' })
    return true
  }

  /** 是否可以跳到某阶段（供 UI 判断 tab 是否可点击） */
  function canJumpTo(phase: PipelinePhase): boolean {
    return phaseIndex(phase) <= furthestPhaseIndex.value
  }

  /**
   * No-API-key escape hatch（"Start from a blank canvas"）：
   * 把 idea + spec 标记为 skipped，直接落进 design 阶段，画布 chrome 随之解锁。
   * 已 completed 的阶段保持 completed（不重写真实历史），dev 阶段调用为 no-op。
   * 跳转记录为 user-override，与 jumpToPhase 一致。
   */
  function skipToDesign(note?: string): boolean {
    const pipeline = activePipeline.value
    const from = pipeline.currentPhase
    if (from === 'dev') return false // 已经走过 design，跳回去没有意义

    const now = Date.now()
    for (const phase of ['idea', 'spec'] as const) {
      if (pipeline.phases[phase].status !== 'completed') {
        pipeline.phases[phase].status = 'skipped'
      }
    }

    if (from !== 'design') {
      pipeline.currentPhase = 'design'
      if (pipeline.phases.design.status === 'pending') {
        pipeline.phases.design.status = 'in-progress'
        pipeline.phases.design.enteredAt = now
      }
      pipeline.history.push({
        from,
        to: 'design',
        timestamp: now,
        reason: 'user-override',
        note: note ?? 'Skipped idea/spec — starting from a blank canvas',
      })
    }
    return true
  }

  return {
    currentPhase,
    phases,
    outputs,
    history,
    furthestPhaseIndex,
    advancePhase,
    revertPhase,
    jumpToPhase,
    canJumpTo,
    skipToDesign,
  }
}
