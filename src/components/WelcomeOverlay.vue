<script setup lang="ts">
import { computed, ref } from 'vue'

import { useEditorStore } from '@/stores/editor'
import { usePipeline } from '@/composables/use-pipeline'
import { track } from '@/lib/analytics'
import OtterMark from '@/components/OtterMark.vue'

const store = useEditorStore()
const { currentPhase } = usePipeline()

// Idea-phase entry: describe the idea in chat, import an existing PRD, or
// skip straight to a blank canvas (skipToDesign). The overlay is the guide —
// no card chrome, content floats on the dimmed canvas.
const emit = defineEmits<{
  action: [type: 'ai' | 'import-prd' | 'blank-canvas' | 'run' | 'script-demo', goal?: string]
}>()

const dismissed = ref(false)
const goal = ref('')

const hasContent = computed(() => {
  void store.state.sceneVersion
  const pageId = store.state.currentPageId
  if (!pageId) return false
  try {
    const children = store.graph.getChildren(pageId)
    return children.length > 0
  } catch {
    const page = store.graph.nodes.get(pageId)
    return !!(page?.childIds && page.childIds.length > 0)
  }
})

const showOverlay = computed(
  () => !dismissed.value && !hasContent.value && currentPhase.value === 'idea'
)

const canRun = computed(() => goal.value.trim().length > 0)

function handleAction(type: 'ai' | 'import-prd' | 'blank-canvas' | 'run' | 'script-demo') {
  track('welcome_action', { action: type })
  dismissed.value = true
  emit('action', type, type === 'run' ? goal.value.trim() : undefined)
}
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-200"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showOverlay"
      data-test-id="welcome-overlay"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-canvas"
    >
      <!-- 深空背景：网格 + 双辉光 -->
      <div
        class="absolute inset-0 opacity-[0.13]"
        :style="{
          backgroundImage:
            'linear-gradient(color-mix(in srgb, var(--color-muted) 35%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-muted) 35%, transparent) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 42%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 42%, black 30%, transparent 75%)',
        }"
      />
      <div
        class="absolute left-1/2 top-[16%] size-[420px] -translate-x-1/2 rounded-full opacity-25 blur-[110px]"
        :style="{ background: 'var(--color-accent)' }"
      />
      <div
        class="absolute bottom-[8%] left-[18%] size-[280px] rounded-full opacity-[0.13] blur-[100px]"
        :style="{ background: 'var(--color-accent-2)' }"
      />

      <div class="pointer-events-none relative flex w-full max-w-xl animate-in flex-col items-center px-6 text-center fade-in slide-in-from-bottom-2 duration-500">
        <!-- 品牌 mark -->
        <div class="relative mb-7">
          <div
            class="absolute inset-0 scale-[1.9] rounded-[28px] opacity-40 blur-2xl"
            :style="{ background: 'var(--gradient-accent)' }"
          />
          <OtterMark :size="64" class="relative drop-shadow-xl" />
        </div>

        <p class="text-[10px] font-semibold uppercase tracking-[0.32em] text-muted">
          Lutris · AI Product Studio
        </p>
        <h2 class="font-display mt-4 text-[34px] font-semibold leading-[1.15] tracking-[-0.025em] text-surface sm:text-[44px]">
          你定目标，<br /><span class="text-gradient">Agent 跑完流水线</span>
        </h2>
        <p class="mt-4 max-w-sm text-[13px] leading-relaxed text-muted">
          从需求、设计到前端代码——agent 自动推进每一步，你只在关键检查点做决策。
        </p>

        <!-- 目标驱动入口：说出目标 → agent 开跑 -->
        <div class="pointer-events-auto mt-9 w-full max-w-md">
          <div
            class="flex items-center gap-2 rounded-2xl border border-border/70 px-4 py-2.5 glass transition-colors focus-within:border-accent/50"
          >
            <icon-lucide-crosshair class="size-4 shrink-0 text-accent" />
            <input
              v-model="goal"
              data-test-id="welcome-goal-input"
              type="text"
              placeholder="描述你的产品目标，例如：给独立开发者做一个记账 SaaS 的落地页"
              class="w-full bg-transparent text-[13px] text-surface outline-none placeholder:text-muted/70"
              @keydown.enter="canRun && handleAction('run')"
            />
          </div>
          <button
            data-test-id="welcome-run"
            :disabled="!canRun"
            class="mt-3 flex w-full items-center justify-center gap-2 rounded-full px-7 py-3 text-[14px] font-medium text-white transition-all duration-150 enabled:hover:scale-[1.02] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 enabled:glow-accent"
            :style="{ background: 'var(--gradient-accent)' }"
            @click="handleAction('run')"
          >
            <icon-lucide-play class="size-4" />
            开始 Run —— agent 接管流水线
          </button>
          <button
            data-test-id="welcome-script-demo"
            class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-border/70 px-5 py-2 text-[12px] text-muted transition-colors hover:border-accent/40 hover:text-surface"
            @click="handleAction('script-demo')"
          >
            <icon-lucide-clapperboard class="size-3.5" />
            先看 agent 演示跑一遍（无需 API key）
          </button>
        </div>

        <div class="mt-7 flex items-center gap-2 text-[12px] text-muted">
          <button
            data-test-id="welcome-describe-idea"
            class="pointer-events-auto transition-colors hover:text-surface"
            @click="handleAction('ai')"
          >聊聊我的想法</button>
          <span class="text-muted/40">·</span>
          <button
            data-test-id="welcome-import-prd"
            class="pointer-events-auto transition-colors hover:text-surface"
            @click="handleAction('import-prd')"
          >导入 PRD</button>
          <span class="text-muted/40">·</span>
          <button
            data-test-id="welcome-blank-canvas"
            class="pointer-events-auto transition-colors hover:text-surface"
            @click="handleAction('blank-canvas')"
          >从空白画布开始</button>
        </div>

        <!-- 流水线 roadmap：玻璃 chips -->
        <div class="mt-14 flex items-center gap-2 whitespace-nowrap text-[11px]">
          <template v-for="(step, i) in ['Idea 想法', 'Spec 需求', 'Design 设计', 'Dev 代码']" :key="step">
            <span
              class="flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-muted glass"
            >
              <span class="font-display font-semibold text-accent">{{ i + 1 }}</span>
              {{ step }}
            </span>
            <span v-if="i < 3" class="h-px w-3 bg-border" />
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>
