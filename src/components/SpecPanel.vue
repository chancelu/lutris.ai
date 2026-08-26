<script setup lang="ts">
// ── Spec Studio（R12）──
// Spec 阶段的主区一等界面：全幅、可编辑的需求板，替代旧的右侧窄栏只读列表。
// 所有编辑走 useSpec 的 CRUD（自动产生版本 + 持久化）；用户也可以在 AI 之外
// 直接「确认 Spec 开始设计」——推进不再只能等 AI 调 submit 工具。
import { computed, ref } from 'vue'

import ProductDocPanel from './ProductDocPanel.vue'
import { useAIChat } from '@/composables/use-chat'
import { usePipeline } from '@/composables/use-pipeline'
import { useAgentRun } from '@/composables/use-agent-run'
import { useProjects } from '@/composables/use-projects'
import { useSpec } from '@/composables/use-spec'
import { track } from '@/lib/analytics'
import { createSpecInteractionRule, type SpecComponentRole, type SpecPage } from '@/types/spec'

const {
  pages, versions, upsertPage, removePage,
  restoreVersion, createSpecPage, createSpecComponent,
} = useSpec()
const { currentPhase, outputs, advancePhase } = usePipeline()
const { activePipeline, saveActiveProjectData } = useProjects()
const { pendingMessage, focusRequested } = useAIChat()

const ideaBrief = computed(() => outputs.value.idea)
// 历史数据里 keyDecisions 可能是字符串（模型没按 schema 传数组时的残留）——读侧归一化
const keyDecisions = computed(() => {
  const kd = ideaBrief.value?.keyDecisions as unknown
  if (!kd) return []
  return Array.isArray(kd) ? (kd as string[]) : [String(kd)]
})
const isSpecPhase = computed(() => currentPhase.value === 'spec')
const canConfirm = computed(() => isSpecPhase.value && pages.value.length > 0)

const ROLES: { value: SpecComponentRole; label: string }[] = [
  { value: 'container', label: '容器' },
  { value: 'list-item', label: '列表项' },
  { value: 'form', label: '表单' },
  { value: 'navigation', label: '导航' },
  { value: 'display', label: '展示' },
  { value: 'action', label: '操作' },
]

// ── Idea brief 内联编辑（提交后仍允许修正——它是后续阶段的"事实源"）──
function patchIdeaBrief(field: 'summary' | 'targetUsers' | 'problem', value: string) {
  const brief = activePipeline.value.outputs.idea
  if (!brief) return
  activePipeline.value.outputs.idea = { ...brief, [field]: value }
  void saveActiveProjectData()
}

// ── Page 编辑：所有变更以整页 upsert 提交（单次 blur = 单个版本，不刷屏）──
function patchPage(page: SpecPage, patch: Partial<SpecPage>, label = 'Edited page') {
  upsertPage({ ...page, ...patch }, 'user', label)
}

function addPage() {
  const page = createSpecPage(`新页面 ${pages.value.length + 1}`)
  upsertPage(page, 'user', 'Added page')
}

function setComponent(page: SpecPage, compId: string, patch: Record<string, unknown>) {
  patchPage(page, {
    components: page.components.map((c) => (c.id === compId ? { ...c, ...patch } : c)),
  }, 'Edited component')
}

function removeComponent(page: SpecPage, compId: string) {
  patchPage(page, { components: page.components.filter((c) => c.id !== compId) }, 'Removed component')
}

function addComponent(page: SpecPage) {
  patchPage(page, {
    components: [...page.components, createSpecComponent('NewComponent')],
  }, 'Added component')
}

function setRule(page: SpecPage, ruleId: string, patch: Record<string, unknown>) {
  patchPage(page, {
    interactionRules: page.interactionRules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)),
  }, 'Edited interaction rule')
}

function removeRule(page: SpecPage, ruleId: string) {
  patchPage(page, { interactionRules: page.interactionRules.filter((r) => r.id !== ruleId) }, 'Removed interaction rule')
}

function addRule(page: SpecPage) {
  patchPage(page, {
    interactionRules: [...page.interactionRules, createSpecInteractionRule('用户操作', '系统响应')],
  }, 'Added interaction rule')
}

// ── 版本历史 ──
const showVersions = ref(false)
const recentVersions = computed(() => [...versions.value].slice(-8).reverse())

// ── 空态：让 AI 拆解 ──
function askAiToDraft() {
  focusRequested.value++
  pendingMessage.value = '请根据已确认的产品定位，把这个产品拆解成具体的页面结构（名称、路由、用途、核心组件、交互规则），拆好后直接提交。'
}

// ── 用户主导推进：确认 Spec → 进入设计阶段并自动开工 ──
function confirmSpec() {
  const result = advancePhase('spec', {
    specDocumentId: pages.value.map((p) => p.id).join(','),
  })
  track('spec_confirm_clicked', { ok: result.valid, pageCount: pages.value.length })
  // Agent 化：若 run 正停在 approve-spec 检查点，这次确认就是决策——
  // resolveCheckpoint 恢复 run，design 接力消息由 run loop 注入。
  // 注意先于 advance 失败返回处理：阶段已被推过（completed）时确认仍是有效决策。
  const { plan, resolveCheckpoint } = useAgentRun()
  if (plan.value?.pendingCheckpoint?.type === 'approve-spec') {
    resolveCheckpoint()
    return
  }
  if (!result.valid) return
  pendingMessage.value = 'Spec 已确认。请按照 Spec 把这些页面逐一渲染到画布上，注意保持统一的设计语言。'
}
</script>

<template>
  <div data-test-id="spec-studio" class="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas">
    <!-- Header：阶段标题 + 版本历史 -->
    <div class="flex shrink-0 items-baseline gap-3 border-b border-border/40 px-8 pb-4 pt-6">
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-medium uppercase tracking-[0.2em] text-accent/80">Spec · 需求定义</p>
        <h1 class="font-display mt-1 truncate text-[22px] leading-snug text-surface">
          {{ ideaBrief?.summary || '把想法拆成可建造的页面' }}
        </h1>
      </div>
      <div class="relative shrink-0">
        <button
          v-if="versions.length > 0"
          class="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted transition hover:bg-hover hover:text-surface"
          @click="showVersions = !showVersions"
        >
          历史 · v{{ versions.length }}
        </button>
        <div
          v-if="showVersions"
          class="glass absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-border p-1 shadow-xl"
        >
          <button
            v-for="v in recentVersions" :key="v.id"
            class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-muted transition hover:bg-hover hover:text-surface"
            @click="restoreVersion(v.id); showVersions = false"
          >
            <span class="shrink-0 text-accent/70">v{{ v.id }}</span>
            <span class="min-w-0 flex-1 truncate">{{ v.label || v.source }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-auto">
      <div class="mx-auto max-w-5xl px-8 py-6">
        <!-- Idea brief：可内联修正的事实源 -->
        <section v-if="ideaBrief" class="glass mb-8 rounded-2xl border border-accent/25 px-5 py-4">
          <p class="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-accent/80">
            <icon-lucide-lightbulb class="size-3" />
            产品定位 · 可点击修正
          </p>
          <div class="grid gap-3 sm:grid-cols-3">
            <label class="block">
              <span class="text-[11px] text-muted">定位</span>
              <input
                :value="ideaBrief.summary"
                class="mt-0.5 w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-[12px] text-surface transition hover:border-border focus:border-accent/50 focus:outline-none"
                @change="patchIdeaBrief('summary', ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="block">
              <span class="text-[11px] text-muted">目标用户</span>
              <input
                :value="ideaBrief.targetUsers"
                class="mt-0.5 w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-[12px] text-surface transition hover:border-border focus:border-accent/50 focus:outline-none"
                @change="patchIdeaBrief('targetUsers', ($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="block">
              <span class="text-[11px] text-muted">核心问题</span>
              <input
                :value="ideaBrief.problem"
                class="mt-0.5 w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-[12px] text-surface transition hover:border-border focus:border-accent/50 focus:outline-none"
                @change="patchIdeaBrief('problem', ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
          <p v-if="keyDecisions.length > 0" class="mt-2 text-[11px] text-amber-400/80">
            待定决策：{{ keyDecisions.join('；') }}
          </p>
        </section>

        <!-- 页面列表 -->
        <section>
          <div class="mb-3 flex items-center gap-2">
            <h2 class="font-display text-[15px] text-surface">页面结构</h2>
            <span class="text-[11px] text-muted">{{ pages.length }} 个页面</span>
            <div class="flex-1" />
            <!-- 想法修正后给一条明确的"重新拆解"路径——旧页面不会自动更新，
                 没有入口用户会以为 spec 卡死（空态才有这个按钮是不够的） -->
            <button
              v-if="pages.length > 0"
              data-test-id="spec-ask-ai"
              class="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/5 px-2.5 py-1 text-[11px] text-accent transition hover:bg-accent/10"
              @click="askAiToDraft"
            >
              <icon-lucide-sparkles class="size-3" />
              让 AI 重新拆解
            </button>
            <button
              data-test-id="spec-add-page"
              class="flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted transition hover:bg-hover hover:text-surface"
              @click="addPage"
            >
              <icon-lucide-plus class="size-3" />
              添加页面
            </button>
          </div>

          <!-- 空态：引导而不是死路 -->
          <div
            v-if="pages.length === 0"
            class="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center"
          >
            <p class="font-display text-[15px] text-surface/90">还没有页面结构</p>
            <p class="mt-1 max-w-sm text-[12px] leading-relaxed text-muted">
              让 AI 根据产品定位帮你拆解，或者手动添加第一个页面。
            </p>
            <div class="mt-4 flex items-center gap-2">
              <button
                data-test-id="spec-ask-ai"
                class="gradient-cta glow-accent rounded-full px-4 py-1.5 text-[12px] font-medium text-on-accent transition-[filter] hover:brightness-110"
                @click="askAiToDraft"
              >
                让 AI 拆解页面
              </button>
              <button
                class="rounded-full border border-border/60 px-4 py-1.5 text-[12px] text-muted transition hover:bg-hover hover:text-surface"
                @click="addPage"
              >
                手动添加
              </button>
            </div>
          </div>

          <div v-else class="grid gap-4 lg:grid-cols-2">
            <article
              v-for="page in pages" :key="page.id"
              data-test-id="spec-page-card"
              class="glass rounded-2xl border border-border/50 p-4"
            >
              <div class="flex items-center gap-2">
                <input
                  :value="page.name"
                  class="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[14px] font-medium text-surface transition hover:border-border focus:border-accent/50 focus:outline-none"
                  @change="patchPage(page, { name: ($event.target as HTMLInputElement).value }, 'Renamed page')"
                />
                <input
                  :value="page.route"
                  class="w-24 shrink-0 rounded-lg border border-transparent bg-transparent px-2 py-1 font-mono text-[11px] text-muted transition hover:border-border focus:border-accent/50 focus:outline-none"
                  @change="patchPage(page, { route: ($event.target as HTMLInputElement).value }, 'Edited route')"
                />
                <button
                  class="rounded-lg p-1 text-muted/60 transition hover:bg-red-500/10 hover:text-red-400"
                  title="删除页面"
                  @click="removePage(page.id, 'user', 'Removed page')"
                >
                  <icon-lucide-trash-2 class="size-3.5" />
                </button>
              </div>

              <input
                :value="page.purpose"
                placeholder="这个页面解决什么问题？"
                class="mt-1 w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-[12px] text-muted transition hover:border-border focus:border-accent/50 focus:text-surface focus:outline-none"
                @change="patchPage(page, { purpose: ($event.target as HTMLInputElement).value })"
              />
              <input
                :value="page.userStory"
                placeholder="作为一个 X，我想要 Y，以便 Z"
                class="mt-0.5 w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-[12px] italic text-muted/80 transition hover:border-border focus:border-accent/50 focus:text-surface focus:outline-none"
                @change="patchPage(page, { userStory: ($event.target as HTMLInputElement).value })"
              />

              <!-- 组件 -->
              <div class="mt-3 space-y-1">
                <p class="px-2 text-[10px] font-medium uppercase tracking-wider text-muted/70">组件</p>
                <div
                  v-for="c in page.components" :key="c.id"
                  class="group flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition hover:bg-hover/60"
                >
                  <select
                    :value="c.role"
                    class="shrink-0 cursor-pointer rounded-md border border-transparent bg-accent/10 px-1 py-0.5 text-[10px] text-accent focus:outline-none"
                    @change="setComponent(page, c.id, { role: ($event.target as HTMLSelectElement).value })"
                  >
                    <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
                  </select>
                  <input
                    :value="c.name"
                    class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 font-mono text-[11px] text-surface/90 transition hover:border-border focus:border-accent/50 focus:outline-none"
                    @change="setComponent(page, c.id, { name: ($event.target as HTMLInputElement).value })"
                  />
                  <button
                    class="shrink-0 rounded px-1 text-[9px] transition"
                    :class="c.repeatable ? 'bg-accent/15 text-accent' : 'text-muted/40 hover:text-muted'"
                    title="是否重复出现（列表项）"
                    @click="setComponent(page, c.id, { repeatable: !c.repeatable })"
                  >
                    ×n
                  </button>
                  <button
                    class="shrink-0 rounded p-0.5 text-muted/40 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                    @click="removeComponent(page, c.id)"
                  >
                    <icon-lucide-x class="size-3" />
                  </button>
                </div>
                <button
                  class="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted/60 transition hover:bg-hover hover:text-surface"
                  @click="addComponent(page)"
                >
                  <icon-lucide-plus class="size-3" />
                  添加组件
                </button>
              </div>

              <!-- 交互规则 -->
              <div class="mt-2 space-y-1">
                <p class="px-2 text-[10px] font-medium uppercase tracking-wider text-muted/70">交互规则</p>
                <div
                  v-for="r in page.interactionRules" :key="r.id"
                  class="group flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition hover:bg-hover/60"
                >
                  <input
                    :value="r.trigger"
                    class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[11px] text-muted transition hover:border-border focus:border-accent/50 focus:text-surface focus:outline-none"
                    @change="setRule(page, r.id, { trigger: ($event.target as HTMLInputElement).value })"
                  />
                  <span class="shrink-0 text-muted/40">→</span>
                  <input
                    :value="r.action"
                    class="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[11px] text-muted transition hover:border-border focus:border-accent/50 focus:text-surface focus:outline-none"
                    @change="setRule(page, r.id, { action: ($event.target as HTMLInputElement).value })"
                  />
                  <button
                    class="shrink-0 rounded p-0.5 text-muted/40 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                    @click="removeRule(page, r.id)"
                  >
                    <icon-lucide-x class="size-3" />
                  </button>
                </div>
                <button
                  class="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted/60 transition hover:bg-hover hover:text-surface"
                  @click="addRule(page)"
                >
                  <icon-lucide-plus class="size-3" />
                  添加规则
                </button>
              </div>
            </article>
          </div>
        </section>

        <!-- 自由文档（兜底：结构化覆盖不到的信息） -->
        <section class="mt-8">
          <h2 class="font-display mb-3 text-[15px] text-surface">补充说明</h2>
          <div class="glass overflow-hidden rounded-2xl border border-border/50">
            <ProductDocPanel default-section="summary" />
          </div>
        </section>
      </div>
    </div>

    <!-- 底部 CTA：用户主导推进（不再只能等 AI 提交） -->
    <div
      v-if="isSpecPhase"
      class="glass flex shrink-0 items-center gap-3 border-t border-border/40 px-8 py-3"
    >
      <p class="min-w-0 flex-1 text-[11px] text-muted">
        {{ pages.length > 0 ? '确认无误后，进入设计阶段生成界面。' : '至少需要一个页面才能进入设计阶段。' }}
      </p>
      <button
        data-test-id="spec-confirm"
        class="gradient-cta glow-accent shrink-0 rounded-full px-5 py-2 text-[12px] font-medium text-on-accent transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        :disabled="!canConfirm"
        @click="confirmSpec"
      >
        确认 Spec，开始设计 →
      </button>
    </div>
  </div>
</template>
