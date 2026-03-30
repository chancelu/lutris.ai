<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useEventListener, useUrlSearchParams } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'

import { useKeyboard } from '@/composables/use-keyboard'
import { useAIChat } from '@/composables/use-chat'
import { useMenu } from '@/composables/use-menu'
import { useProductDoc } from '@/composables/use-product-doc'
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
import ContextDrawer from '@/components/ContextDrawer.vue'

const designFileInput = ref<HTMLInputElement | null>(null)
const aiPanelHighlight = ref(false)
const route = useRoute()
const router = useRouter()
const firstTab = createTab()
const store = useEditorStore()
useKeyboard()
useMenu()
const { activeTab: rightTab, focusRequested, inlinePanel } = useAIChat()
const { updateFromDesign } = useProductDoc()
const {
  init: initProjects, switchProject, activeProjectId,
  activeProject, projects: projectsList, createProject,
  startAutosave, stopAutosave
} = useProjects()

onMounted(async () => {
  await initProjects()
  const pid = route.params.projectId as string | undefined
  if (pid && pid !== activeProjectId.value) await switchProject(pid, store)
  else if (!pid && activeProjectId.value) router.replace(`/editor/${activeProjectId.value}`)
  startAutosave(store)
})
onUnmounted(() => stopAutosave())

function onSyncPRD() {
  const pageId = store.state.currentPageId
  if (!pageId) return
  const page = store.graph.nodes.get(pageId)
  const childIds = page?.children || []
  if (!childIds.length) return
  const desc = childIds.map(id => {
    const n = store.graph.nodes.get(id)
    return n ? `- ${n.name || n.type} (${n.type}, ${Math.round(n.width || 0)}×${Math.round(n.height || 0)})` : null
  }).filter(Boolean).join('\n')
  updateFromDesign(`# Design State (AI Updated)\n\n${desc}`)
  rightTab.value = 'spec'
}
onMounted(() => window.addEventListener('sync-prd-from-design', onSyncPRD))
onUnmounted(() => window.removeEventListener('sync-prd-from-design', onSyncPRD))
async function handleDesignFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const { useAssetLibrary } = await import('@/composables/use-asset-library')
    const { loadLibrary } = useAssetLibrary()
    await loadLibrary(file)
  } catch (err) {
    toast.show(`Failed to import .fig: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
  } finally { input.value = '' }
}

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

function onWelcomeAction(type: string) {
  if (type === 'blank') return
  if (type === 'ai') {
    rightTab.value = 'create'
    focusRequested.value++
    aiPanelHighlight.value = true
    setTimeout(() => { aiPanelHighlight.value = false }, 800)
    return
  }
  if (type === 'import' || type === 'import-fig') { designFileInput.value?.click(); return }
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
        rightTab.value = 'spec'
      }
    }
    input.click()
  }
}

function onExportClick() {
  const pageId = store.state.currentPageId
  if (pageId) {
    const page = store.graph.nodes.get(pageId)
    const childIds = page?.children || []
    if (childIds.length === 0) {
      toast.show('Nothing to export', 'warning')
      return
    }
  }
  inlinePanel.value = inlinePanel.value === 'export' ? null : 'export'
}

const disconnectAutomation = import.meta.env.DEV ? connectAutomation(getActiveStore).disconnect : undefined
if (disconnectAutomation) onUnmounted(disconnectAutomation)

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
    <input ref="designFileInput" type="file" accept=".fig" class="hidden" @change="handleDesignFileChange" />

    <TopBar
      v-if="showChrome && store.state.showUI"
      :project-name="activeProject?.name || store.state.documentName"
      :projects="projectsList"
      :active-project-id="activeProjectId"
      @switch-project="onSwitchProject"
      @create-project="onCreateProject"
      @import-click="designFileInput?.click()"
      @export-click="onExportClick"
    />

    <div class="relative flex flex-1 overflow-hidden">
      <!-- Left: AI Panel -->
      <div
        v-if="showChrome && store.state.showUI"
        class="flex w-[360px] shrink-0 flex-col border-r border-border/10 bg-panel transition-shadow duration-300"
        :class="aiPanelHighlight && 'animate-[ai-panel-highlight_0.8s_ease-in-out]'"
      >
        <PropertiesPanel />
      </div>

      <!-- Center: Canvas + Toolbar + WelcomeOverlay -->
      <div class="relative flex flex-1 flex-col overflow-hidden">
        <EditorCanvas class="min-h-0 flex-1" />
        <WelcomeOverlay v-if="showChrome" @action="onWelcomeAction" />
        <div v-if="showChrome && store.state.showUI" class="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center">
          <div class="pointer-events-auto">
            <Toolbar />
          </div>
        </div>
      </div>

      <!-- Right: Context Drawer (on-demand, overlays canvas edge) -->
      <div v-if="showChrome && store.state.showUI" class="absolute right-0 top-0 bottom-0 z-10">
        <ContextDrawer />
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
