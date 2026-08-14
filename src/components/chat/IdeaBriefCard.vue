<script setup lang="ts">
// Idea 阶段确认后的产品定位摘要卡。
// IdeaBrief 之前只注入后续阶段的 system prompt，用户在 UI 上看不到自己确认了什么 ——
// 这张卡让它在聊天流顶部可见、可折叠，作为后续所有阶段的"事实源"锚点。
import { computed, ref } from 'vue'

import { usePipeline } from '@/composables/use-pipeline'

const { outputs, currentPhase } = usePipeline()

const brief = computed(() => outputs.value.idea)
// 历史数据里 keyDecisions 可能是字符串（模型没按 schema 传数组时的残留）——读侧归一化
const keyDecisions = computed(() => {
  const kd = brief.value?.keyDecisions as unknown
  if (!kd) return []
  return Array.isArray(kd) ? (kd as string[]) : [String(kd)]
})
// 只在 idea 已经确认（即流程已走出 idea 阶段）后展示
const visible = computed(() => brief.value != null && currentPhase.value !== 'idea')

const collapsed = ref(false)
</script>

<template>
  <div
    v-if="visible && brief"
    data-test-id="idea-brief-card"
    class="glass mx-3 mt-3 shrink-0 rounded-xl border border-accent/25 px-3 py-2"
  >
    <button
      class="flex w-full items-center gap-2 text-left"
      :aria-expanded="!collapsed"
      @click="collapsed = !collapsed"
    >
      <icon-lucide-lightbulb class="size-3.5 shrink-0 text-accent" />
      <span class="min-w-0 flex-1 truncate text-[11px] font-medium text-surface">
        {{ brief.summary }}
      </span>
      <icon-lucide-chevron-down
        class="size-3 shrink-0 text-muted transition-transform"
        :class="{ '-rotate-90': collapsed }"
      />
    </button>
    <div v-if="!collapsed" class="mt-2 space-y-1.5 border-t border-accent/10 pt-2 text-[11px] leading-relaxed">
      <p class="text-muted">
        <span class="font-medium text-surface/80">定位</span> — {{ brief.summary }}
      </p>
      <p class="text-muted">
        <span class="font-medium text-surface/80">目标用户</span> — {{ brief.targetUsers }}
      </p>
      <p class="text-muted">
        <span class="font-medium text-surface/80">核心问题</span> — {{ brief.problem }}
      </p>
      <p v-if="keyDecisions.length > 0" class="text-muted">
        <span class="font-medium text-amber-400/80">待定决策</span> — {{ keyDecisions.join('；') }}
      </p>
    </div>
  </div>
</template>
