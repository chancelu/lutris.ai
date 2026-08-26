// ── 剧本演示模式（Scripted Demo）──
// 确定性执行器：不调模型，按剧本把 run 的每一步真实执行出来——
// 产出全是真的（IDB 里的 spec 页面、画布上的 frame、code-output 里的代码），
// 只是"agent 的脑子"换成了一段剧本。用途：
//   1. 零 API key 的新用户体验：先看见 agent 怎么跑完整条流水线
//   2. e2e 全链路驱动器：检查点暂停/恢复走的都是生产代码路径
// 剧本与 AI 路径共用同一台 Run Loop 引擎——每个剧本步骤结束同样调
// notifyAgentTurnFinished()，由引擎决定接力 / 暂停 / 收尾。

import { watch } from 'vue'

import { useAgentRun, useScriptMode } from '@/composables/use-agent-run'
import { exportCodeDirectly } from '@/composables/use-phase-actions'
import { usePipeline } from '@/composables/use-pipeline'
import { useSpec } from '@/composables/use-spec'
import { track } from '@/lib/analytics'
import { useEditorStore } from '@/stores/editor'

import type { Fill } from '@llc3233149/core'
import type { SpecPage } from '@/types/spec'

const DEMO_GOAL = '给独立开发者做一个记账 SaaS 的落地页'

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function solid(r: number, g: number, b: number): Fill {
  return { type: 'SOLID', color: { r, g, b, a: 1 }, opacity: 1, visible: true }
}

// ── 剧本内容：一个足够小但完整的产品（落地页 + 仪表盘）──
function demoSpecPages(): SpecPage[] {
  const { createSpecPage, createSpecComponent } = useSpec()
  return [
    createSpecPage('落地页', {
      route: '/',
      purpose: '把访客转化为注册用户',
      userStory: '作为独立开发者，我想快速了解这个记账工具能帮我省多少时间，以便决定要不要试用',
      components: [
        createSpecComponent('NavBar', { role: 'navigation' }),
        createSpecComponent('HeroSection', { role: 'container' }),
        createSpecComponent('FeatureGrid', { role: 'container' }),
        createSpecComponent('PricingTable', { role: 'display' }),
        createSpecComponent('SignupButton', { role: 'action' }),
      ],
    }),
    createSpecPage('仪表盘', {
      route: '/dashboard',
      purpose: '用户查看本月收支概览并快速记一笔',
      userStory: '作为注册用户，我想一眼看到本月花了多少钱，以便控制预算',
      components: [
        createSpecComponent('SidebarNav', { role: 'navigation' }),
        createSpecComponent('StatCard', { role: 'list-item', repeatable: true, dataBinding: 'stat.value' }),
        createSpecComponent('ExpenseChart', { role: 'display', dataBinding: 'expenses.byDay' }),
        createSpecComponent('AddRecordButton', { role: 'action' }),
      ],
    }),
  ]
}

// ── 画布渲染：每个 SpecPage 生成一个真实的 web 页面 Frame ──
// 确定性版式（hero + 特性栅格 + CTA），保证 e2e 与人工验收看到一致的画面。
// 入参用结构类型：useSpec 的 pages 是 DeepReadonly，这里只读不写。
interface ScriptPageLike {
  id: string
  name: string
  purpose: string
  userStory: string
  components: ReadonlyArray<{ name: string; role: string; dataBinding?: string }>
}

function renderSpecPagesToCanvas(pages: ReadonlyArray<ScriptPageLike>): Record<string, string> {
  const store = useEditorStore()
  const { graph } = store
  const map: Record<string, string> = {}

  pages.forEach((page, i) => {
    const x = 140 + i * 1400
    const frameId = store.createShape('FRAME', x, 140, 1280, 800)
    graph.updateNode(frameId, {
      name: page.name,
      fills: [solid(0.98, 0.98, 0.99)],
      clipsContent: true,
    })

    // 顶部导航条
    const navId = store.createShape('RECTANGLE', 0, 0, 1280, 64, frameId)
    graph.updateNode(navId, { name: 'NavBar', fills: [solid(1, 1, 1)] })
    const logoId = store.createShape('TEXT', 48, 20, 160, 24, frameId)
    graph.updateNode(logoId, {
      name: 'Logo',
      text: page.name === '落地页' ? 'Lutris Books' : `${page.name} · Lutris Books`,
      fontSize: 18,
      fontWeight: 700,
      fills: [solid(0.1, 0.1, 0.12)],
    })

    // Hero 标题/副文案
    const heroId = store.createShape('TEXT', 48, 160, 720, 56, frameId)
    graph.updateNode(heroId, {
      name: 'HeroTitle',
      text: page.name,
      fontSize: 44,
      fontWeight: 700,
      fills: [solid(0.08, 0.08, 0.1)],
    })
    const subId = store.createShape('TEXT', 48, 232, 720, 28, frameId)
    graph.updateNode(subId, {
      name: 'HeroSubtitle',
      text: page.purpose || page.userStory || page.name,
      fontSize: 18,
      fontWeight: 400,
      fills: [solid(0.42, 0.44, 0.5)],
    })

    // 特性卡片（按 spec 组件数生成，体现"按 Spec 渲染"）
    const comps = page.components.filter((c) => c.role !== 'navigation' && c.role !== 'action')
    comps.slice(0, 3).forEach((comp, ci) => {
      const cardId = store.createShape('FRAME', 48 + ci * 400, 330, 368, 180, frameId)
      graph.updateNode(cardId, {
        name: comp.name,
        cornerRadius: 16,
        fills: [solid(1, 1, 1)],
        strokes: [{ color: { r: 0.9, g: 0.9, b: 0.93, a: 1 }, weight: 1, opacity: 1, visible: true, align: 'INSIDE' as const }],
      })
      const cardTitle = store.createShape('TEXT', 24, 24, 320, 24, cardId)
      graph.updateNode(cardTitle, {
        name: 'Title',
        text: comp.name,
        fontSize: 18,
        fontWeight: 600,
        fills: [solid(0.1, 0.1, 0.12)],
      })
      const cardBody = store.createShape('TEXT', 24, 60, 320, 60, cardId)
      graph.updateNode(cardBody, {
        name: 'Body',
        text: comp.dataBinding ? `绑定数据：${comp.dataBinding}` : page.purpose,
        fontSize: 13,
        fontWeight: 400,
        fills: [solid(0.5, 0.52, 0.58)],
      })
    })

    // CTA 按钮（spec 里的 action 组件）
    const action = page.components.find((c) => c.role === 'action')
    const ctaId = store.createShape('FRAME', 48, 580, 200, 52, frameId)
    graph.updateNode(ctaId, {
      name: action?.name ?? 'CTA',
      cornerRadius: 26,
      fills: [solid(0.23, 0.51, 0.96)],
      layoutMode: 'HORIZONTAL',
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED',
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
    })
    const ctaText = store.createShape('TEXT', 0, 0, 120, 22, ctaId)
    graph.updateNode(ctaText, {
      name: 'Label',
      text: action?.name === 'AddRecordButton' ? '记一笔' : '免费开始',
      fontSize: 16,
      fontWeight: 600,
      fills: [solid(1, 1, 1)],
    })

    map[page.id] = frameId
  })

  store.clearSelection()
  return map
}

/**
 * 跑一遍完整的 agent 演示：brief → spec →（人确认）→ design → export → 自检 →（人验收）。
 * 两个检查点是真的停下来的——用户在 Spec Studio 点确认、在验收卡点验收，
 * 剧本靠 watch run 状态在检查点解除后继续。
 */
export async function runScriptedDemo(goal: string) {
  const agentRun = useAgentRun()
  const { advancePhase } = usePipeline()
  const spec = useSpec()
  const script = useScriptMode()

  script.set(true)
  agentRun.startRun(goal.trim() || DEMO_GOAL)
  track('script_demo_started')
  const run = agentRun.run

  // 每个剧本步骤只演一次（watch 会因 status/currentStepId 双变而重复触发）
  const acted = new Set<string>()

  const actOnCurrentStep = async () => {
    if (run.value.status !== 'running') return
    const step = agentRun.plan.value?.steps.find((s) => s.id === run.value.currentStepId)
    if (!step || step.kind !== 'auto' || acted.has(step.id)) return
    acted.add(step.id)

    if (step.phase === 'idea') {
      await sleep(1400) // 让用户看清"agent 正在想"
      advancePhase('idea', {
        summary: '面向独立开发者的轻量记账 SaaS：30 秒记一笔，自动生成月度报表',
        targetUsers: '独立开发者 / 自由职业者（个人或小团队管账）',
        problem: '记账软件要么太重（企业财务），要么太碎（纯手动），独立开发者需要"快记 + 看得懂报表"的中间态',
        keyDecisions: ['Web 优先，暂不做桌面端', '单币种起步'],
      })
      agentRun.notifyAgentTurnFinished()
      return
    }

    if (step.phase === 'spec') {
      await sleep(1000)
      for (const page of demoSpecPages()) {
        spec.upsertPage(page, 'ai', 'Script demo: spec page')
        await sleep(300) // 页面一条条出现，看得见"agent 在拆需求"
      }
      agentRun.notifyAgentTurnFinished()
      // 引擎随即停在 approve-spec 检查点——等人在 Spec Studio 确认
      return
    }

    if (step.phase === 'design') {
      await sleep(800)
      const map = renderSpecPagesToCanvas(spec.pages.value)
      const result = advancePhase('design', { pageNodeMap: map, renderedAt: Date.now() })
      if (!result.valid) {
        agentRun.stopRun()
        return
      }
      agentRun.notifyAgentTurnFinished()
      return
    }

    if (step.phase === 'dev') {
      // 导出步；紧随其后的自检步由引擎内联完成（action: 'self-check'）
      await sleep(800)
      exportCodeDirectly()
      advancePhase('dev', { frameworks: ['vue', 'react'], exportedAt: Date.now() })
      agentRun.notifyAgentTurnFinished()
      // 引擎内联自检后停在 accept-delivery 检查点——等人验收
      return
    }
  }

  // 检查点被解决后 run 回到 running，watch 驱动剧本接着演
  const stopStep = watch(
    () => [run.value.status, run.value.currentStepId] as const,
    () => { void actOnCurrentStep() },
  )
  const stopFinal = watch(
    () => run.value.status,
    (s) => {
      if (s === 'completed' || s === 'failed' || s === 'stopped') {
        stopStep()
        stopFinal()
        script.set(false)
        track('script_demo_finished', { outcome: s })
      }
    },
  )

  await actOnCurrentStep()
}
