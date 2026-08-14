// ── Phase Tool Whitelists + Submit Bridges（Task 10）──
// createAITools() 从 packages/core 拿到全量工具集（ALL_TOOLS → coreTools）。
// 这里按 pipeline phase 过滤出该阶段该开放的子集，并挂上对应的
// submit_xxx 工具——AI 主动调用它来触发 usePipeline().advancePhase()。
//
// 设计取舍（Task 10 三个架构性决策，见思路文档）：
// 1. Idea/Spec 阶段严格不开 canvas 工具，保持关注点分离
// 2. Submit 由 AI 主动调用触发推进，而不是纯前端按钮驱动
// 3. 阶段可回退（return_to_phase）：流程是持续迭代的，不是单行道——
//    修改仍发生在对应阶段内（dev 里想改设计，先回 design 再改），
//    但 agent 绝不能以"阶段已锁定"为由拒绝用户（实测踩坑：dev 阶段
//    agent 直接告诉用户"画布不能再改"）

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
 * 阶段回退工具（idea 阶段不挂——前面没有可回的阶段）。
 * 流程是持续迭代：用户在 dev 想改设计、在 design 想改 spec，agent 调用
 * return_to_phase 跳回对应阶段后继续用该阶段的工具修改——绝不能回答
 * "阶段已锁定/画布不能再改"。jumpToPhase 本身限制只能跳到到达过的阶段。
 */
export function createReturnTool(phase: PipelinePhase): ToolSet {
  if (phase === 'idea') return {}
  return {
    return_to_phase: tool({
      description:
        'Return to an earlier pipeline phase when the user wants to revise work done there — e.g. from dev back to design to change layouts/colors/copy on the canvas, or from design back to spec to adjust requirements. The pipeline is iterative, NOT a one-way door: never tell the user a phase is locked or that the canvas can no longer be modified. After returning, your tools and instructions automatically switch to that phase — continue the requested changes there.',
      parameters: valibotSchema(
        v.object({
          phase: v.pipe(
            v.picklist(['idea', 'spec', 'design', 'dev']),
            v.description('The earlier phase to return to')
          ),
          reason: v.pipe(v.string(), v.description('What the user wants to revise there')),
        })
      ),
      // @ts-expect-error -- valibotSchema doesn't properly infer execute param types for tool()
      // eslint-disable-next-line typescript/no-explicit-any -- valibotSchema doesn't infer execute params
      execute: async (args: any) => {
        const { jumpToPhase, currentPhase } = usePipeline()
        const target = args.phase as PipelinePhase
        if (target === currentPhase.value) {
          return { success: true, message: `Already in the ${target} phase — proceed with the changes.` }
        }
        const ok = jumpToPhase(target)
        if (!ok) {
          return {
            success: false,
            needsMoreInfo: true,
            error: `Cannot return to ${target} — the project has not reached it yet. This is NOT a fatal error: continue in the current phase instead.`,
          }
        }
        return {
          success: true,
          message: `Returned to the ${target} phase (${args.reason}). Your tool set and instructions now match ${target}. IMPORTANT: make the requested changes NOW with tool calls in this same turn — do not end your turn with a promise like "请稍等" or "I'll regenerate"; the user only sees what your tools actually do.`,
        }
      },
    }),
  }
}

/**
 * §4.4: 只读上下文工具。Design 阶段挂 get_spec_pages，让 agent 随时重新查询
 * 完整 spec 细节（user story、component role、交互规则），system prompt 里只注入
 * 紧凑摘要（id/name/route/purpose/组件名），不把整个 spec 塞进上下文。
 */
export function createPhaseReadTools(phase: PipelinePhase): ToolSet {
  if (phase !== 'design') return {}
  return {
    get_spec_pages: tool({
      description: 'Get the full approved spec pages (id, name, route, purpose, user story, components with roles, interaction rules). Read-only. Use each page id as a key in submit_design_output.pageNodeMap.',
      parameters: valibotSchema(v.object({})),
      // @ts-expect-error -- valibotSchema doesn't properly infer execute param types for tool()
      execute: async () => {
        const { pages } = useSpec()
        return JSON.stringify({
          pages: pages.value.map((p) => ({
            id: p.id,
            name: p.name,
            route: p.route,
            purpose: p.purpose,
            userStory: p.userStory,
            components: p.components.map((c) => ({
              id: c.id,
              name: c.name,
              role: c.role,
              repeatable: c.repeatable,
              dataBinding: c.dataBinding,
            })),
            interactionRules: p.interactionRules,
          })),
        })
      },
    }),
  }
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
          // 模型实测会把参数套一层（{"arguments": {...}} / {"brief": {...}}）或传空 {}、
          // 然后把 brief 写在正文里——先尽力拆包归一，再校验空字段。
          // eslint-disable-next-line typescript/no-explicit-any -- 同上
          const unwrap = (v: any): any => {
            for (const key of ['arguments', 'brief', 'input'] as const) {
              if (v?.[key] && typeof v[key] === 'object') return v[key]
            }
            return v ?? {}
          }
          // eslint-disable-next-line typescript/no-explicit-any -- 同上
          const a: any = unwrap(args)
          // 前置校验空字段：模型偶尔会传空串/空白，直接告诉它缺哪一项、怎么补救，
          // 而不是把校验器的简短 reason 原样抛回（用户会在聊天里看到它，容易误以为系统出错）。
          const missing = (['summary', 'targetUsers', 'problem'] as const).filter(
            (key) => typeof a[key] !== 'string' || !a[key].trim()
          )
          if (missing.length > 0) {
            return {
              success: false,
              needsMoreInfo: true,
              error:
                `Idea brief is incomplete — missing or empty: ${missing.join(', ')}. ` +
                'Do NOT write the brief in your message text — pass each field as a tool parameter. ' +
                'Call submit_idea_brief again with summary, targetUsers and problem as non-empty string arguments. ' +
                'If the user has not given you enough for a confident positioning, ask them first.',
            }
          }
          const result = advancePhase('idea', {
            summary: a.summary.trim(),
            targetUsers: a.targetUsers.trim(),
            problem: a.problem.trim(),
            // 模型有时把 keyDecisions 传成字符串（schema 没挡住）——归一化成数组，
            // 否则下游 .join() 直接 TypeError（Spec Studio 渲染崩溃的实测根因）
            keyDecisions: Array.isArray(a.keyDecisions)
              ? a.keyDecisions
              : (a.keyDecisions ? [String(a.keyDecisions)] : []),
          })
          if (!result.valid) {
            return {
              success: false,
              needsMoreInfo: true,
              error:
                `${result.reason}。这不是致命错误：请继续和用户对话补全信息，然后重新调用 submit_idea_brief。`,
            }
          }
          return { success: true, message: 'Idea brief submitted. Advancing to Spec phase. Start drafting the spec pages right away (the Spec Studio is now visible to the user) — ask at most one focused question if a decision is genuinely blocking, otherwise call submit_spec_output with a concrete page breakdown.' }
        },
      }),
    }
  }

  if (phase === 'spec') {
    return {
      submit_spec_output: tool({
        description: 'Submit the finalized spec (pages, components, interaction rules) once the user has approved it or asked you to just build it. This advances the project to the Design phase. Each page needs name, route (e.g. "/products"), purpose, userStory (作为一个 X，我想要 Y，以便 Z); components have a name and a role of container | list-item | form | navigation | display | action.',
        // 宽松 schema + execute 内归一化：模型常把 role 传成 picklist 外的值
        // （中文、"display 组件"…）、把 components 传成字符串数组、或漏掉
        // userStory。严格 schema 会在 execute 之前直接抛 "An error occurred."，
        // 模型拿不到可操作的反馈只会原样重试——用户看到的就是一排红色 Error。
        parameters: valibotSchema(
          v.object({
            pages: v.pipe(
              v.array(
                v.object({
                  name: v.string(),
                  route: v.optional(v.string(), ''),
                  purpose: v.optional(v.string(), ''),
                  userStory: v.optional(v.string(), ''),
                  components: v.optional(v.array(v.any()), []),
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
          const pages = Array.isArray(args?.pages) ? args.pages : []
          if (pages.length === 0) {
            return {
              success: false,
              needsMoreInfo: true,
              error:
                'Spec is empty — no pages were provided. This is NOT a fatal error: break the product down into pages ' +
                '(each with name, route, purpose, userStory) and call submit_spec_output again with a non-empty pages array.',
            }
          }
          const VALID_ROLES = ['container', 'list-item', 'form', 'navigation', 'display', 'action']
          const normRole = (r: unknown) => {
            const s = (typeof r === 'string' ? r : '').toLowerCase()
            return VALID_ROLES.find((role) => s === role || s.includes(role)) ?? 'display'
          }
          // eslint-disable-next-line typescript/no-explicit-any -- 入参来自模型，形状不可信
          const specPages = pages.map((p: any, i: number) => {
            const name = String(p?.name ?? '').trim() || `Page ${i + 1}`
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            const page = createSpecPage(name, {
              route: String(p?.route ?? '').trim() || (slug ? `/${slug}` : (i === 0 ? '/' : `/page-${i + 1}`)),
              purpose: String(p?.purpose ?? '').trim() || name,
              userStory: String(p?.userStory ?? '').trim(),
            })
            const rawComponents = Array.isArray(p?.components) ? p.components : []
            // eslint-disable-next-line typescript/no-explicit-any -- 同上
            page.components = rawComponents.map((c: any, ci: number) => {
              if (typeof c === 'string') return createSpecComponent(c, { role: 'display' })
              return createSpecComponent(String(c?.name ?? '').trim() || `Component ${ci + 1}`, {
                role: normRole(c?.role) as never,
                repeatable: c?.repeatable === true,
                dataBinding: typeof c?.dataBinding === 'string' ? c.dataBinding : undefined,
              })
            })
            upsertPage(page, 'ai', `Spec submitted: ${name}`)
            return page
          })

          const result = advancePhase('spec', { specDocumentId: specPages.map((p: { id: string }) => p.id).join(',') })
          if (!result.valid) return JSON.stringify({ success: false, error: result.reason })
          // §4.3: 返回真实 page id 列表，Design 阶段 agent 靠这些 id 构造
          // submit_design_output.pageNodeMap 的 key，而不是自己瞎编。
          return JSON.stringify({
            success: true,
            message:
              `Spec submitted with ${specPages.length} page(s). Advancing to Design phase. ` +
              `Your NEXT action IN THIS SAME TURN: render the first page ("${specPages[0]?.name ?? 'page 1'}") onto the canvas with the render tool NOW — ` +
              'the user wants to SEE pages appear, not read a plan. One render call per page, then render the remaining pages. ' +
              'After all pages are on the canvas, summarize briefly and STOP — do NOT call submit_design_output until the user has seen the pages and reacted.',
            pages: specPages.map((p: { id: string; name: string; route: string }) => ({ id: p.id, name: p.name, route: p.route })),
          })
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
              v.optional(v.record(v.string(), v.string()), {}),
              v.description('Map of SpecPage.id -> canvas Frame node id')
            ),
          })
        ),
        // @ts-expect-error -- valibotSchema doesn't properly infer execute param types for tool()
        // eslint-disable-next-line typescript/no-explicit-any -- valibotSchema doesn't infer execute params
        execute: async (args: any) => {
          // 与 submit_spec_output 同一模式：不给硬校验错误，告诉模型缺什么、怎么补
          const map = args?.pageNodeMap && typeof args.pageNodeMap === 'object' ? args.pageNodeMap : {}
          if (Object.keys(map).length === 0) {
            return {
              success: false,
              needsMoreInfo: true,
              error:
                'pageNodeMap is empty. This is NOT a fatal error: call get_spec_pages for the real spec page ids, ' +
                'find each page\'s rendered Frame node id on the canvas, then call submit_design_output again with a non-empty map.',
            }
          }
          const result = advancePhase('design', { pageNodeMap: map, renderedAt: Date.now() })
          if (!result.valid) return { success: false, error: result.reason }
          return { success: true, message: 'Design submitted. Advancing to Dev phase. Next: call export_code (and optionally export_tailwind_config) IN THIS SAME TURN so the Code panel fills up immediately — do not wait to be asked.' }
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
            v.array(v.string()),
            v.description('Which frameworks code was exported for (vue | react)')
          ),
        })
      ),
      // @ts-expect-error -- valibotSchema doesn't properly infer execute param types for tool()
      // eslint-disable-next-line typescript/no-explicit-any -- valibotSchema doesn't infer execute params
      execute: async (args: any) => {
        const frameworks = (Array.isArray(args?.frameworks) ? args.frameworks : [])
          .map((f: unknown) => String(f).toLowerCase())
          .filter((f: string) => f === 'vue' || f === 'react')
        if (frameworks.length === 0) {
          return {
            success: false,
            needsMoreInfo: true,
            error:
              'frameworks is empty or invalid. This is NOT a fatal error: export the code first (export_code), ' +
              'then call submit_dev_output again with frameworks like ["vue"] or ["vue", "react"].',
          }
        }
        const result = advancePhase('dev', { frameworks, exportedAt: Date.now() })
        if (!result.valid) return { success: false, error: result.reason }
        return { success: true, message: 'Dev output submitted. Pipeline complete.' }
      },
    }),
  }
}
