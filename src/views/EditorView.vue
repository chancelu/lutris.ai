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
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import TopBar from '@/components/TopBar.vue'
import Toolbar from '@/components/Toolbar.vue'
import WelcomeOverlay from '@/components/WelcomeOverlay.vue'
import LeftSidebar from '@/components/LeftSidebar.vue'

const aiPanelHighlight = ref(false)
const route = useRoute()
const router = useRouter()
const firstTab = createTab()
const store = useEditorStore()
useKeyboard()
useMenu()
const { currentPhase } = usePipeline()
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
  const pid = route.params.projectId as string | undefined
  if (pid && pid !== activeProjectId.value) {
    await switchProject(pid, store)
  } else if (activeProjectId.value) {
    // Reload design from IDB on refresh (initProjects doesn't load .fig)
    await switchProject(activeProjectId.value, store)
    if (!pid && !route.meta.demo) router.replace(`/editor/${activeProjectId.value}`)
  }
  startAutosave(store)
})
onUnmounted(() => stopAutosave())

// Save design and chat when page becomes hidden (tab switch, close, refresh)
useEventListener(document, 'visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    syncChatToProject()
    void saveCurrentDesign(store)
  }
})
// Also sync on beforeunload as a safety net (visibilitychange may not fire on all browsers)
useEventListener(window, 'beforeunload', () => {
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
        inlinePanel.value = 'spec'
      }
    }
    input.click()
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
    get currentPhase() { return pipeline.currentPhase.value },
    get phases() { return pipeline.phases.value },
  }
}

useEventListener(document, 'wheel', (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) e.preventDefault()
}, { passive: false })

const params = useUrlSearchParams('history')
const showChrome = !('no-chrome' in params)
if (route.meta.demo && !('test' in params)) createDemoShapes(firstTab.store)
else if (!route.meta.demo) firstTab.store.restoreFromIDB()
useHead({ title: route.meta.demo ? 'Demo' : undefined })
</script>

<template>
  <div data-test-id="editor-root" class="flex h-screen w-screen flex-col overflow-hidden">
    <TopBar
      v-if="showChrome && store.state.showUI"
      :project-name="activeProject?.name || store.state.documentName"
      :projects="projectsList"
      :active-project-id="activeProjectId"
      @switch-project="onSwitchProject"
      @create-project="onCreateProject"
      @delete-project="onDeleteProject"
      @export-click="onExportClick"
    />

    <div class="relative flex flex-1 overflow-hidden">
      <!-- Left: Layers + Design Properties — only relevant once AI can touch the canvas (Design/Dev) -->
      <LeftSidebar v-if="showChrome && store.state.showUI && showCanvasChrome" data-region="left" />

      <!-- Center: Canvas + Toolbar + WelcomeOverlay -->
      <div class="relative flex flex-1 flex-col overflow-hidden" data-region="canvas">
        <EditorCanvas class="min-h-0 flex-1" />
        <WelcomeOverlay v-if="showChrome" @action="onWelcomeAction" />
        <div v-if="showChrome && store.state.showUI && showCanvasChrome" class="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center">
          <div class="pointer-events-auto">
            <Toolbar />
          </div>
        </div>
        <div
          v-if="showChrome && store.state.showUI && !showCanvasChrome"
          class="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center"
        >
          <div class="pointer-events-auto rounded-full border border-border/10 bg-panel/90 px-3 py-1.5 text-[11px] text-muted shadow-lg shadow-black/15 backdrop-blur-md">
            画布工具会在 Design 阶段解锁 — 先在右侧和 AI 聊清楚需求
          </div>
        </div>
      </div>

      <!-- Right: AI Chat Panel -->
      <div
        v-if="showChrome && store.state.showUI"
        data-region="right"
        class="flex w-[360px] shrink-0 flex-col border-l border-border/10 bg-panel transition-shadow duration-300"
        :class="aiPanelHighlight && 'animate-[ai-panel-highlight_0.8s_ease-in-out]'"
      >
        <PropertiesPanel />
      </div>
    </div>

    <!-- Minimal UI when showUI is false -->
    <div v-if="showChrome && !store.state.showUI" class="absolute top-7 left-7 z-10 flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 shadow-sm">
      <img src="/lutris-mascot.png" class="h-4 w-auto object-contain" alt="Lutris.ai" />
      <span data-test-id="editor-document-name" class="text-xs text-surface">{{ store.state.documentName }}</span>
      <button data-test-id="editor-show-ui" class="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface" title="Show UI" @click="store.state.showUI = true">
        <icon-lucide-sidebar class="size-3.5" />
      </button>
    </div>
  </div>
</template>
