// ── Agent 化工具：计划与检查点（方案 B）──
// propose_plan：orchestrator 在 run 开始时产出自定义计划（可选——
//   不调也有 createDefaultPlan 的标准模板兜底）。
// ask_clarifying_questions：idea 阶段发现关键歧义时，挂 clarify 检查点
//   暂停 run，给用户结构化选项卡（给选项不给作文题）。

import { valibotSchema } from '@ai-sdk/valibot'
import { tool } from 'ai'
import * as v from 'valibot'

import { useAgentRun } from '@/composables/use-agent-run'
import { normalizePlan } from '@/types/plan'

import type { PlanStep } from '@/types/plan'
import type { ToolSet } from 'ai'

export function createPlanTools(): ToolSet {
  return {
    propose_plan: tool({
      description:
        'Propose a customized execution plan for the current run. Call once near the start if the goal needs a non-standard breakdown (e.g. extra pages, no code export). Steps run in order; each step has a title, a pipeline phase (idea/spec/design/dev), and a kind (auto = you execute it, checkpoint = pause for a human decision). Approval checkpoints (approve-spec, accept-delivery) are added automatically if omitted — never leave the user without decision points.',
      parameters: valibotSchema(
        v.object({
          steps: v.array(
            v.object({
              title: v.string(),
              phase: v.picklist(['idea', 'spec', 'design', 'dev']),
              kind: v.picklist(['auto', 'checkpoint']),
              checkpointType: v.optional(v.picklist(['clarify', 'approve-spec', 'accept-delivery'])),
            })
          ),
        })
      ),
      // @ts-expect-error -- valibotSchema doesn't infer execute params
      execute: async ({ steps }: { steps: Array<Partial<PlanStep>> }) => {
        const plan = normalizePlan({ goal: '', steps, createdAt: Date.now() })
        if (!plan) return { ok: false, reason: '计划为空或全部步骤无效，已保留默认计划' }
        const { adoptPlan, plan: current } = useAgentRun()
        plan.goal = current.value?.goal ?? plan.goal
        adoptPlan(plan)
        return { ok: true, stepCount: plan.steps.length }
      },
    }),

    ask_clarifying_questions: tool({
      description:
        'Pause the run and ask the user ONE critical clarifying question with structured options (A/B/C + free text). Use only for genuine ambiguity that materially changes the product direction — never for trivia, never more than twice per run. The run resumes automatically when the user answers.',
      parameters: valibotSchema(
        v.object({
          question: v.pipe(v.string(), v.description('The single most important question')),
          options: v.pipe(
            v.array(v.string()),
            v.description('2-4 concrete options the user can pick with one click')
          ),
        })
      ),
      // @ts-expect-error -- valibotSchema doesn't infer execute params
      execute: async ({ question, options }: { question: string; options: string[] }) => {
        const { requestClarification } = useAgentRun()
        requestClarification({ question, options: options.slice(0, 4), allowFreeText: true })
        return { ok: true, note: 'Run paused at clarify checkpoint; it resumes when the user answers.' }
      },
    }),
  }
}
