<script setup lang="ts">
import { computed, ref } from 'vue'

import { useEditorStore } from '@/stores/editor'
import { usePipeline } from '@/composables/use-pipeline'
import OtterMark from '@/components/OtterMark.vue'

const store = useEditorStore()
const { currentPhase } = usePipeline()

// Idea-phase entry: describe the idea in chat, import an existing PRD, or
// skip straight to a blank canvas (skipToDesign). The overlay is the guide —
// no card chrome, content floats on the dimmed canvas.
const emit = defineEmits<{
  action: [type: 'ai' | 'import-prd' | 'blank-canvas']
}>()

const dismissed = ref(false)

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

function handleAction(type: Parameters<typeof emit>[1]) {
  dismissed.value = true
  emit('action', type)
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
          从一个想法，<br />到<span class="text-gradient">可交付的产品</span>
        </h2>
        <p class="mt-4 max-w-sm text-[13px] leading-relaxed text-muted">
          需求定义、界面设计、前端代码——和 AI 聊几句，一条流水线走完。
        </p>

        <button
          data-test-id="welcome-describe-idea"
          class="pointer-events-auto mt-10 flex items-center gap-2 rounded-full px-7 py-3 text-[14px] font-medium text-white transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98] glow-accent"
          :style="{ background: 'var(--gradient-accent)' }"
          @click="handleAction('ai')"
        >
          <icon-lucide-sparkles class="size-4" />
          聊聊我的想法
        </button>

        <div class="mt-6 flex items-center gap-2 text-[12px] text-muted">
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
