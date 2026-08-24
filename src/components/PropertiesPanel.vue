<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAIChat } from '@/composables/use-chat'
import { useAISelect } from '@/composables/use-ai-select'
import { usePipeline } from '@/composables/use-pipeline'
import { useEditorStore } from '@/stores/editor'

import ChatPanel from './ChatPanel.vue'
import CodePanel from './CodePanel.vue'
import DesignPanel from './DesignPanel.vue'
import ExportPanel from './ExportPanel.vue'
import OtterMark from './OtterMark.vue'

const { inlinePanel, focusRequested } = useAIChat()
const { currentPhase } = usePipeline()
const { addCurrentSelection } = useAISelect()
const store = useEditorStore()

// R12: Spec 不再住在右栏——它是主区的一等界面（Spec Studio）。
// R14: 右栏 = Framer "Agent | Style" 范式——AI 对话 / 设计属性 / Code(dev)
// 同居一栏，分段切换。阶段推进不再把聊天切走，Code tab 上亮圆点提示。
const canViewCode = computed(() => currentPhase.value === 'dev')
const canViewDesign = computed(() => currentPhase.value === 'design' || currentPhase.value === 'dev')
const hasSelection = computed(() => (store.state.selectedIds?.size ?? 0) > 0)
const hasNewCode = ref(false)

watch(currentPhase, (phase, prev) => {
  if (phase === prev) return
  if (phase === 'dev') hasNewCode.value = true
})

watch(inlinePanel, (panel) => {
  if (panel === 'code') hasNewCode.value = false
})

// 如果用户落在当前阶段不允许的视图（如通过 stepper 跳回），回退到聊天。
watch(canViewCode, () => {
  if (inlinePanel.value === 'code' && !canViewCode.value) inlinePanel.value = null
})
watch(canViewDesign, () => {
  if (inlinePanel.value === 'design' && !canViewDesign.value) inlinePanel.value = null
})

type View = 'code' | 'design' | null
function setView(view: View) {
  inlinePanel.value = inlinePanel.value === view ? null : view
}

function editWithAI() {
  addCurrentSelection()
  inlinePanel.value = null
  focusRequested.value++
}
</script>

<template>
  <aside
    data-test-id="properties-panel"
    class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden select-text"
  >
    <!-- Header: icon-only tool switch。R15b 信息架构——顶部步进器是"工作流阶段"
         (idea→spec→design→dev)，右栏是"工具箱"：AI 对话（主）/ 属性检查器（选中
         图层）/ 代码导出（dev 产物）。图标化 + tooltip，不再用"设计/Code"字样重复
         阶段名；有选中图层时属性图标亮蓝点，有新代码时代码图标亮蓝点。 -->
    <div class="flex shrink-0 items-center gap-2 px-3 pb-1.5 pt-3">
      <div class="flex items-center rounded-full border border-border/30 bg-black/20 p-0.5">
        <button
          data-test-id="panel-view-chat"
          class="flex items-center justify-center rounded-full px-3 py-1 transition"
          :class="!inlinePanel ? 'bg-panel text-accent shadow-md shadow-black/20' : 'text-muted hover:text-surface'"
          title="AI 对话"
          @click="inlinePanel = null"
        >
          <icon-lucide-message-square class="size-3.5" />
        </button>
        <button
          v-if="canViewDesign"
          data-test-id="panel-view-design"
          class="relative flex items-center justify-center rounded-full px-3 py-1 transition"
          :class="inlinePanel === 'design' ? 'bg-panel text-accent shadow-md shadow-black/20' : 'text-muted hover:text-surface'"
          title="属性检查器（选中画布上的图层查看/编辑）"
          @click="setView('design')"
        >
          <icon-lucide-sliders-horizontal class="size-3.5" />
          <span
            v-if="hasSelection && inlinePanel !== 'design'"
            data-test-id="panel-view-design-dot"
            class="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-accent"
          />
        </button>
        <button
          v-if="canViewCode"
          data-test-id="panel-view-code"
          class="relative flex items-center justify-center rounded-full px-3 py-1 transition"
          :class="inlinePanel === 'code' ? 'bg-panel text-accent shadow-md shadow-black/20' : 'text-muted hover:text-surface'"
          title="代码导出（Dev 阶段产物）"
          @click="setView('code')"
        >
          <icon-lucide-code class="size-3.5" />
          <span
            v-if="hasNewCode"
            data-test-id="panel-view-code-dot"
            class="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-accent"
          />
        </button>
      </div>

      <!-- 当前视图名——让"我在哪"永远有文字锚点，又不与阶段名撞车 -->
      <span class="text-[11px] font-medium text-muted">
        {{ inlinePanel === 'design' ? '属性' : inlinePanel === 'code' ? '代码' : inlinePanel === 'export' ? 'Export' : 'AI 助手' }}
      </span>

      <div class="flex-1" />

      <!-- Export view close (Export is opened from TopBar / Ctrl+J) -->
      <button
        v-if="inlinePanel === 'export'"
        data-test-id="panel-export-close"
        class="ml-1 flex size-5 items-center justify-center rounded text-muted transition hover:bg-hover hover:text-surface"
        title="Back to chat"
        @click="inlinePanel = null"
      >
        <icon-lucide-x class="size-3" />
      </button>
    </div>

    <!-- Chat — always alive, default view -->
    <div v-show="!inlinePanel" class="flex min-h-0 flex-1 flex-col overflow-hidden [user-select:text] [-webkit-user-select:text]">
      <ChatPanel class="flex-1" />
    </div>

    <!-- Design properties (selection) -->
    <div v-show="inlinePanel === 'design'" class="flex min-h-0 flex-1 flex-col overflow-hidden [user-select:text] [-webkit-user-select:text]">
      <template v-if="hasSelection">
        <DesignPanel class="min-h-0 flex-1" />
        <div class="shrink-0 border-t border-border/30 p-3">
          <button
            data-test-id="panel-edit-with-ai"
            class="gradient-cta glow-accent flex w-full items-center justify-center gap-2 rounded-full px-3 py-2.5 text-[12px] font-medium text-on-accent transition-[filter] hover:brightness-110"
            @click="editWithAI"
          >
            <icon-lucide-sparkles class="size-3.5" />
            Edit with AI
          </button>
        </div>
      </template>
      <div v-else class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <OtterMark :size="48" class="opacity-80" />
        <p class="text-[11px] text-muted">在画布上选中一个图层，就能在这里调整它的属性</p>
      </div>
    </div>

    <!-- Code view (dev phase) -->
    <div v-show="inlinePanel === 'code'" class="flex min-h-0 flex-1 flex-col overflow-hidden [user-select:text] [-webkit-user-select:text]">
      <CodePanel class="flex-1" />
    </div>

    <!-- Export view -->
    <div v-show="inlinePanel === 'export'" class="flex min-h-0 flex-1 flex-col overflow-hidden overflow-y-auto [user-select:text] [-webkit-user-select:text]">
      <ExportPanel class="flex-1" />
    </div>
  </aside>
</template>
