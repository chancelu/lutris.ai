<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useEventListener, useUrlSearchParams } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'

import { useKeyboard } from '@/composables/use-keyboard'
import { useAIChat } from '@/composables/use-chat'
import { useMenu } from '@/composables/use-menu'
import { usePipeline } from '@/composables/use-pipeline'
import { useProjects } from '@/composables/use-projects'
import { toast } from '@/composables/use-toast'
import { connectAutomation } from '@/automation/server'
import { createDemoShapes } from '@/demo'
import { useEditorStore } from '@/stores/editor'
import { createTab, getActiveStore } from '@/stores/tabs'

import EditorCanvas from '@/components/EditorCanvas.vue'
import OtterMark from '@/components/OtterMark.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import SpecPanel from '@/components/SpecPanel.vue'
import TopBar from '@/components/TopBar.vue'
import WelcomeOverlay from '@/components/WelcomeOverlay.vue'
import ToolDock from '@/components/ToolDock.vue'
import ZoomControls from '@/components/ZoomControls.vue'

const aiPanelHighlight = ref(false)
const route = useRoute()
const router = useRouter()
const firstTab = createTab()
const store = useEditorStore()
useKeyboard()
useMenu()
const { currentPhase, skipToDesign, skipToSpec } = usePipeline()
// Idea/Spec 阶段 AI 没有 canvas 工具权限（见 phase-tools.ts filterToolsByPhase），
// 画布上的工具箱/图层面板此时点了也没用——收起来，把注意力留在对话上。
const showCanvasChrome = computed(() => currentPhase.value === 'design' || currentPhase.value === 'dev')
const { focusRequested, inlinePanel, pendingMessage, syncChatToProject } = useAIChat()
const {
  init: initProjects, switchProject, activeProjectId,
  activeProject, projects: projectsList, createProject,
  deleteProject, startAutosave, stopAutosave, saveCurrentDesign
} = useProjects()

onMounted(async () => {
  await initProjects()
  // Demo 路由：只展示预置演示内容。不 switchProject（否则 resetToBlank 会抹掉
  // createDemoShapes 刚创建的演示节点），也不启动自动保存（否则演示内容会被
  // 写回用户真实项目的 IDB 存档，造成数据覆盖）。
  if (route.meta.demo) return
  const pid = route.params.projectId as string | undefined
  if (pid && pid !== activeProjectId.value) {
    await switchProject(pid, store)
  } else if (activeProjectId.value) {
    // Reload design from IDB on refresh (initProjects doesn't load .fig)
    await switchProject(activeProjectId.value, store)
    if (!pid) router.replace(`/editor/${activeProjectId.value}`)
  }
  startAutosave(store)
})
onUnmounted(() => stopAutosave())

// Save design and chat when page becomes hidden (tab switch, close, refresh)
useEventListener(document, 'visibilitychange', () => {
  if (route.meta.demo) return // demo 内容永远不落盘
  if (document.visibilityState === 'hidden') {
    syncChatToProject()
    void saveCurrentDesign(store)
  }
})
// Also sync on beforeunload as a safety net (visibilitychange may not fire on all browsers)
useEventListener(window, 'beforeunload', () => {
  if (route.meta.demo) return
  syncChatToProject()
  void saveCurrentDesign(store)
})

async function onSwitchProject(projectId: string) {
  if (projectId === activeProjectId.value) return
  await switchProject(projectId, store)
  store.state.documentName = activeProject.value?.name ?? 'Untitled'
}

async function onCreateProject() {
  const meta = await createProject('Untitled Project')
  await switchProject(meta.id, store)
  store.state.documentName = meta.name
}

async function onDeleteProject(projectId: string) {
  await deleteProject(projectId)
  if (projectsList.value.length === 0) {
    const meta = await createProject('Untitled Project')
    await switchProject(meta.id, store)
    store.state.documentName = meta.name
  } else if (activeProjectId.value) {
    // Load the switched-to project's design into the editor
    await switchProject(activeProjectId.value, store)
    store.state.documentName = activeProject.value?.name ?? 'Untitled'
  }
}

function onWelcomeAction(type: string) {
  if (type === 'ai') {
    inlinePanel.value = null
    focusRequested.value++
    aiPanelHighlight.value = true
    setTimeout(() => { aiPanelHighlight.value = false }, 800)
    return
  }
  if (type === 'import-prd') {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.txt,.docx,.doc'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (file) {
        const { useProductDoc } = await import('@/composables/use-product-doc')
        const { importFile } = useProductDoc()
        await importFile(file)
        // PRD 即需求——跳过 idea 直接进入 Spec Studio
        skipToSpec(`Imported PRD: ${file.name}`)
      }
    }
    input.click()
    return
  }
  if (type === 'blank-canvas') {
    skipToDesign()
  }
}

function onExportClick() {
  const pageId = store.state.currentPageId
  if (pageId) {
    const page = store.graph.nodes.get(pageId)
    const childIds = page?.childIds || []
    if (childIds.length === 0) {
      toast.show('Nothing to export', 'warning')
      return
    }
  }
  inlinePanel.value = inlinePanel.value === 'export' ? null : 'export'
}

const disconnectAutomation = import.meta.env.DEV ? connectAutomation(getActiveStore).disconnect : undefined
if (disconnectAutomation) onUnmounted(disconnectAutomation)

if (import.meta.env.DEV) {
  const pipeline = usePipeline()
  window.__OPEN_PENCIL_PIPELINE__ = {
    advancePhase: pipeline.advancePhase,
    jumpToPhase: pipeline.jumpToPhase,
    canJumpTo: pipeline.canJumpTo,
    revertPhase: pipeline.revertPhase,
    skipToDesign: pipeline.skipToDesign,
    get currentPhase() { return pipeline.currentPhase.value },
    get phases() { return pipeline.phases.value },
  }
}

useEventListener(document, 'wheel', (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) e.preventDefault()
}, { passive: false })

const params = useUrlSearchParams('history')
const showChrome = !('no-chrome' in params)
// 不要在 setup 阶段 restoreFromIDB（旧的全局 session 恢复槽）：它和
// onMounted 里 per-project 的 switchProject 加载是竞态——全局槽的
// openFigFile 后落地，把别的项目的场景盖到当前项目上，下一次
// saveCurrentDesign 就把串了的场景写进错误项目的 IDB（画布版"串项目"）。
// 项目系统下画布只由 switchProject(projectId) 驱动；旧数据由
// migrateLegacySession 一次性迁移进默认项目。
if (route.meta.demo && !('test' in params)) createDemoShapes(firstTab.store)
useHead({ title: route.meta.demo ? 'Demo' : undefined })
</script>

<template>
  <div data-test-id="editor-root" class="relative flex h-screen w-screen overflow-hidden">
    <!-- Center: Canvas + phase surfaces（全幅，chrome 全部悬浮其上）.
         Spec 阶段主区是 Spec Studio（全幅可编辑需求板），不再露出空白画布。 -->
    <div class="relative flex min-w-0 flex-1 flex-col overflow-hidden" data-region="canvas">
      <EditorCanvas class="min-h-0 flex-1" />
      <!-- Spec Studio 给悬浮 chrome 让位：顶部留出 TopBar（h≈52）、右侧留出
           悬浮面板（360+12）——否则底部 CTA「确认 Spec，开始设计」会被面板盖住
           （R15 右栏改悬浮后引入的遮挡，实测"spec 里进不了设计"的根因）。 -->
      <SpecPanel v-if="showChrome && currentPhase === 'spec'" class="absolute inset-0 z-10 pr-[372px] pt-14" />
      <!-- Demo 路由是预置内容展示，不走引导流程，不弹欢迎浮层（否则会挡住 demo 内容） -->
        <WelcomeOverlay v-if="showChrome && !route.meta.demo" @action="onWelcomeAction" />

      <!-- R15: 悬浮 chrome —— 顶栏三段 pill / 底部居中工具 dock / 右下缩放控件 / 右侧悬浮玻璃面板 -->
      <div v-if="showChrome && store.state.showUI" class="pointer-events-none absolute inset-x-3 top-3 z-30">
        <TopBar
          :project-name="activeProject?.name || store.state.documentName"
          :projects="projectsList"
          :active-project-id="activeProjectId"
          @switch-project="onSwitchProject"
          @create-project="onCreateProject"
          @delete-project="onDeleteProject"
          @export-click="onExportClick"
        />
      </div>
      <div
        v-if="showChrome && store.state.showUI && showCanvasChrome"
        data-region="dock"
        class="absolute bottom-4 left-1/2 z-20 -translate-x-1/2"
      >
        <ToolDock />
      </div>
      <div
        v-if="showChrome && store.state.showUI && showCanvasChrome"
        class="absolute bottom-4 left-4 z-20"
      >
        <ZoomControls />
      </div>

      <!-- Right: 悬浮玻璃面板 —— AI Chat / Design / Code（与画布 chrome 同一语言） -->
      <div
        v-if="showChrome && store.state.showUI"
        data-region="right"
        class="glass absolute bottom-3 right-3 top-16 z-20 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-border/40 shadow-2xl shadow-black/30 transition-shadow duration-300"
        :class="aiPanelHighlight && 'animate-[ai-panel-highlight_0.8s_ease-in-out]'"
      >
        <PropertiesPanel />
      </div>
    </div>

    <!-- Minimal UI when showUI is false -->
    <div v-if="showChrome && !store.state.showUI" class="glass absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-border px-3 py-1.5 shadow-xl">
      <OtterMark :size="16" />
      <span data-test-id="editor-document-name" class="text-xs text-surface">{{ store.state.documentName }}</span>
      <button data-test-id="editor-show-ui" class="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface" title="Show UI" @click="store.state.showUI = true">
        <icon-lucide-sidebar class="size-3.5" />
      </button>
    </div>
  </div>
</template>
