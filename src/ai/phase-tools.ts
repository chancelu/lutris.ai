// ── Phase Tool Whitelists + Submit Bridges（Task 10）──
// createAITools() 从 packages/core 拿到全量工具集（ALL_TOOLS → coreTools）。
// 这里按 pipeline phase 过滤出该阶段该开放的子集，并挂上对应的
// submit_xxx 工具——AI 主动调用它来触发 usePipeline().advancePhase()。
//
// 设计取舍（Task 10 三个架构性决策，见思路文档）：
// 1. Idea/Spec 阶段严格不开 canvas 工具，保持关注点分离
// 2. Submit 由 AI 主动调用触发推进，而不是纯前端按钮驱动
// 3. 不加 AI 主动 revert 工具，退回仍走用户手动操作

import { valibotSchema } from '@ai-sdk/valibot'
import { tool } from 'ai'
import * as v from 'valibot'

import { usePipeline } from '@/composables/use-pipeline'
import { useSpec } from '@/composables/use-spec'
import { createSpecComponent, createSpecPage } from '@/types/spec'

import type { PipelinePhase } from '@/types/pipeline'
import type { AITools } from '@/ai/tools'
import type { ToolSet } from 'ai'

// Dev 阶段只开放只读检查 + 导出工具，不允许改画布。
// Design 阶段开放除这些以外的全部（render、create 系列、set 系列、describe、analyze 等）。
const DEV_TOOL_NAMES = new Set([
  'get_jsx',
  'describe',
  'get_page_tree',
  'list_pages',
  'get_selection',
  'get_node',
  'find_nodes',
  'export_code',
  'export_tailwind_config',
])

/** 按 phase 过滤 createAITools() 产出的核心工具集（不含 submit_xxx，那些单独挂）。 */
export function filterToolsByPhase(allTools: AITools['tools'], phase: PipelinePhase): AITools['tools'] {
  if (phase === 'idea' || phase === 'spec') {
    // Idea/Spec 阶段没有任何 canvas 工具
    return {} as AITools['tools']
  }
  if (phase === 'dev') {
    return Object.fromEntries(
      Object.entries(allTools).filter(([name]) => DEV_TOOL_NAMES.has(name))
    ) as AITools['tools']
  }
  // design phase: 除了 export_code/export_tailwind_config，其余全开
  // （代码导出是 Dev 阶段的事，Design 阶段不需要）
  return Object.fromEntries(
    Object.entries(allTools).filter(([name]) => name !== 'export_code' && name !== 'export_tailwind_config')
  ) as AITools['tools']
}

/**
 * 构造当前 phase 的 submit_xxx 桥接工具。调用即触发 usePipeline().advancePhase()。
 * 校验失败时把 reason 原样返回给 AI，让它知道该阶段产出还缺什么、继续对话补全。
 */
export function createSubmitTools(phase: PipelinePhase): ToolSet {
  const { advancePhase } = usePipeline()

  if (phase === 'idea') {
    return {
      submit_idea_brief: tool({
        description: 'Submit the finalized idea brief once you have a confident summary, target users, and problem statement. This advances the project to the Spec phase.',
        parameters: valibotSchema(
          v.object({
            summary: v.pipe(v.string(), v.description('One-sentence product positioning')),
            targetUsers: v.pipe(v.string(), v.description('Who this product is for')),
            problem: v.pipe(v.string(), v.description('The core pain point this solves')),
            keyDecisions: v.optional(
              v.pipe(v.array(v.string()), v.description('Unresolved decisions the user should confirm, e.g. "single-player or collaborative?"')),
              []
            ),
          })
        ),
        // @ts-expect-error -- valibotSchema doesn't properly infer execute param types for tool()
        // eslint-disable-next-line typescript/no-explicit-any -- valibotSchema doesn't infer execute params
        execute: async (args: any) => {
          const result = advancePhase('idea', {
            summary: args.summary,
            targetUsers: args.targetUsers,
            problem: args.problem,
            keyDecisions: args.keyDecisions ?? [],
          })
          if (!result.valid) return { success: false, error: result.reason }
          return { success: true, message: 'Idea brief submitted. Advancing to Spec phase.' }
        },
      }),
    }
  }

  if (phase === 'spec') {
    return {
      submit_spec_output: tool({
        description: 'Submit the finalized spec (pages, components, interaction rules) once the user has approved it or asked you to just build it. This advances the project to the Design phase.',
        parameters: valibotSchema(
          v.object({
            pages: v.pipe(
              v.array(
                v.object({
                  name: v.string(),
                  route: v.pipe(v.string(), v.description('e.g. "/products"')),
                  purpose: v.string(),
                  userStory: v.pipe(v.string(), v.description('作为一个 X，我想要 Y，以便 Z')),
                  components: v.optional(
                    v.array(
                      v.object({
                        name: v.string(),
                        role: v.picklist(['container', 'list-item', 'form', 'navigation', 'display', 'action']),
                        repeatable: v.optional(v.boolean(), false),
                        dataBinding: v.optional(v.string()),
                      })
                    ),
                    []
                  ),
                })
              ),
              v.description('The pages to create for this product')
            ),
          })
        ),
        // @ts-expect-error -- valibotSchema doesn't properly infer execute param types for tool()
        // eslint-disable-next-line typescript/no-explicit-any -- valibotSchema doesn't infer execute params
        execute: async (args: any) => {
          const { upsertPage } = useSpec()
          const specPages = args.pages.map((p: {
            name: string
            route: string
            purpose: string
            userStory: string
            components?: Array<{ name: string; role: string; repeatable?: boolean; dataBinding?: string }>
          }) => {
            const page = createSpecPage(p.name, { route: p.route, purpose: p.purpose, userStory: p.userStory })
            page.components = (p.components ?? []).map((c) =>
              createSpecComponent(c.name, {
                role: c.role as never,
                repeatable: c.repeatable ?? false,
                dataBinding: c.dataBinding,
              })
            )
            upsertPage(page, 'ai', `Spec submitted: ${p.name}`)
            return page
          })

          const result = advancePhase('spec', { specDocumentId: specPages.map((p: { id: string }) => p.id).join(',') })
          if (!result.valid) return { success: false, error: result.reason }
          return { success: true, message: `Spec submitted with ${specPages.length} page(s). Advancing to Design phase.` }
        },
      }),
    }
  }

  if (phase === 'design') {
    return {
      submit_design_output: tool({
        description: 'Submit the mapping from spec page id to rendered canvas node id once all pages are rendered and pass the pre-delivery checklist. This advances the project to the Dev phase.',
        parameters: valibotSchema(
          v.object({
            pageNodeMap: v.pipe(
              v.record(v.string(), v.string()),
              v.description('Map of SpecPage.id -> canvas Frame node id')
            ),
          })
        ),
        // @ts-expect-error -- valibotSchema doesn't properly infer execute param types for tool()
        // eslint-disable-next-line typescript/no-explicit-any -- valibotSchema doesn't infer execute params
        execute: async (args: any) => {
          const result = advancePhase('design', { pageNodeMap: args.pageNodeMap, renderedAt: Date.now() })
          if (!result.valid) return { success: false, error: result.reason }
          return { success: true, message: 'Design submitted. Advancing to Dev phase.' }
        },
      }),
    }
  }

  // dev — last phase, submit just closes it out (no next phase to advance to)
  return {
    submit_dev_output: tool({
      description: 'Submit the list of exported frameworks once the user confirms the exported code looks correct. This finalizes the pipeline.',
      parameters: valibotSchema(
        v.object({
          frameworks: v.pipe(
            v.array(v.picklist(['vue', 'react'])),
            v.description('Which frameworks code was exported for')
          ),
        })
      ),
      // @ts-expect-error -- valibotSchema doesn't properly infer execute param types for tool()
      // eslint-disable-next-line typescript/no-explicit-any -- valibotSchema doesn't infer execute params
      execute: async (args: any) => {
        const result = advancePhase('dev', { frameworks: args.frameworks, exportedAt: Date.now() })
        if (!result.valid) return { success: false, error: result.reason }
        return { success: true, message: 'Dev output submitted. Pipeline complete.' }
      },
    }),
  }
}
