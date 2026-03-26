<script setup lang="ts">
import { provide, ref, onMounted, onUnmounted } from 'vue'
import NextStepCard from '@/components/NextStepCard.vue'
import { useBreakpoints, useEventListener, useUrlSearchParams } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'

import { useKeyboard } from '@/composables/use-keyboard'
import { useAIChat } from '@/composables/use-chat'
import { useMenu } from '@/composables/use-menu'
import { useCollab, COLLAB_KEY } from '@/composables/use-collab'
import { useProductDoc } from '@/composables/use-product-doc'
import { useOnlineStatus } from '@/composables/use-online-status'
import { useI18n } from '@/composables/use-i18n'
import { useProjects } from '@/composables/use-projects'
import { toast } from '@/composables/use-toast'
import { connectAutomation } from '@/automation/server'
import { createDemoShapes } from '@/demo'
import { useEditorStore } from '@/stores/editor'
import { createTab, activeTab, getActiveStore } from '@/stores/tabs'

import CollabPanel from '@/components/CollabPanel.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import LayersPanel from '@/components/LayersPanel.vue'
import MobileDrawer from '@/components/MobileDrawer.vue'
import MobileHud from '@/components/MobileHud.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import SafariBanner from '@/components/SafariBanner.vue'
import TabBar from '@/components/TabBar.vue'
import Toolbar from '@/components/Toolbar.vue'
import UserMenu from '@/components/UserMenu.vue'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import LocaleSwitcher from '@/components/LocaleSwitcher.vue'
// eslint-disable-next-line typescript/consistent-type-imports -- used in template
import ShortcutsPanel from '@/components/ShortcutsPanel.vue'
import WelcomeOverlay from '@/components/WelcomeOverlay.vue'
import FloatingInspector from '@/components/FloatingInspector.vue'

const shortcutsPanelRef = ref<InstanceType<typeof ShortcutsPanel> | null>(null)

function onToggleShortcuts() { shortcutsPanelRef.value?.toggle() }
onMounted(() => window.addEventListener('toggle-shortcuts', onToggleShortcuts))
onUnmounted(() => window.removeEventListener('toggle-shortcuts', onToggleShortcuts))

const route = useRoute()
const router = useRouter()
const firstTab = createTab()
const store = useEditorStore()
const breakpoints = useBreakpoints({ mobile: 768 })
const isMobile = breakpoints.smaller('mobile')
useKeyboard()
useMenu()
const { isOnline } = useOnlineStatus()
const { t } = useI18n()
const { activeTab: rightTab, draftMessage } = useAIChat()
const { updateFromDesign } = useProductDoc()
const importNextSteps = ref<{ title: string; body: string; actions: Array<{ label: string; value: string }> } | null>(null)
const { init: initProjects, switchProject, activeProjectId, startAutosave, stopAutosave } = useProjects()

// ── Project initialization ──
onMounted(async () => {
  await initProjects()

  const routeProjectId = route.params.projectId as string | undefined
  if (routeProjectId && routeProjectId !== activeProjectId.value) {
    await switchProject(routeProjectId, store)
  } else if (!routeProjectId && activeProjectId.value) {
    // Redirect to project-specific URL
    router.replace(`/editor/${activeProjectId.value}`)
  }

  startAutosave(store)
})

onUnmounted(() => {
  stopAutosave()
})

// Listen for AI-triggered PRD sync
function onSyncPRD() {
  // Gather current design description from page children
  const pageId = store.state.currentPageId
  if (!pageId) return
  const page = store.graph.nodes.get(pageId)
  const childIds = page?.children || []
  if (!childIds.length) return
  const desc = childIds.map(id => {
    const n = store.graph.nodes.get(id)
    if (!n) return null
    return `- ${n.name || n.type} (${n.type}, ${Math.round(n.width || 0)}×${Math.round(n.height || 0)})`
  }).filter(Boolean).join('\n')
  updateFromDesign(`# Design State (AI Updated)\n\n${desc}`)
  rightTab.value = 'spec'
}
onMounted(() => window.addEventListener('sync-prd-from-design', onSyncPRD))
onUnmounted(() => window.removeEventListener('sync-prd-from-design', onSyncPRD))

function handleImportNextStep(action: string) {
  if (action === 'analyze-ai') {
    rightTab.value = 'create'
    draftMessage.value = 'Analyze this imported design and suggest the highest-impact improvements.'
  } else if (action === 'generate-spec') {
    rightTab.value = 'spec'
  } else if (action === 'export-assets') {
    rightTab.value = 'ship'
  } else if (action === 'to-design') {
    rightTab.value = 'create'
    draftMessage.value = 'Turn this imported PRD into a first-pass UI direction and screen structure.'
  }
  importNextSteps.value = null
}

function onWelcomeAction(type: string) {
  if (type === 'blank') {
    // Just dismiss overlay, canvas is already empty and ready
  } else if (type === 'ai') {
    rightTab.value = 'create'
  } else if (type === 'import' || type === 'import-fig') {
    document.querySelector<HTMLInputElement>('input[type="file"]')?.click()
    importNextSteps.value = {
      title: 'Design imported',
      body: 'Nice. Now decide whether to analyze it with AI, generate a spec summary, or move straight to export.',
      actions: [
        { label: 'Analyze with AI', value: 'analyze-ai' },
        { label: 'Generate spec summary', value: 'generate-spec' },
        { label: 'Export assets', value: 'export-assets' }
      ]
    }
  } else if (type === 'import-prd') {
    // Open file picker for PRD import
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
        importNextSteps.value = {
          title: 'PRD imported',
          body: 'Good. Review the spec, turn it into a design brief, or jump into AI to generate a first pass.',
          actions: [
            { label: 'Review spec', value: 'generate-spec' },
            { label: 'Turn into design', value: 'to-design' },
            { label: 'Open AI workspace', value: 'analyze-ai' }
          ]
        }
      }
    }
    input.click()
  }
}
// Automation bridge only runs in dev (local WebSocket server on :7601)
const disconnectAutomation = import.meta.env.DEV
  ? connectAutomation(getActiveStore).disconnect
  : undefined
if (disconnectAutomation) onUnmounted(disconnectAutomation)
const collab = useCollab(firstTab.store)
provide(COLLAB_KEY, collab)

useEventListener(
  document,
  'wheel',
  (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault()
  },
  { passive: false }
)

const params = useUrlSearchParams('history')
const showChrome = !('no-chrome' in params)
if (route.meta.demo && !('test' in params)) {
  createDemoShapes(firstTab.store)
} else if (!route.meta.demo) {
  // Try to restore last session from IndexedDB
  firstTab.store.restoreFromIDB()
}

useHead({ title: route.meta.demo ? 'Demo' : undefined })
</script>

<template>
  <div data-test-id="editor-root" class="flex h-screen w-screen flex-col overflow-hidden">
    <!-- Offline banner -->
    <div
      v-if="!isOnline"
      class="flex shrink-0 items-center justify-center gap-2 bg-amber-600/90 px-3 py-1 text-[12px] text-white"
    >
      <icon-lucide-wifi-off class="size-3.5" />
      <span>{{ t('offline.banner') }}</span>
    </div>
    <SafariBanner />
    <TabBar />

    <!-- Desktop layout -->
    <SplitterGroup
      v-if="!isMobile && showChrome && store.state.showUI"
      :key="activeTab?.id"
      direction="horizontal"
      class="min-h-0 flex-1 overflow-hidden"
      auto-save-id="editor-layout"
    >
      <SplitterPanel :default-size="18" :min-size="10" :max-size="30" class="flex min-h-0">
        <LayersPanel />
      </SplitterPanel>
      <SplitterResizeHandle
        data-test-id="left-splitter-handle"
        class="group relative z-10 -mx-1 w-2 cursor-col-resize"
      >
        <div class="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
      </SplitterResizeHandle>
      <SplitterPanel :default-size="64" :min-size="30" class="flex min-h-0">
        <div class="relative flex min-w-0 flex-1">
          <EditorCanvas />
          <Toolbar />
          <FloatingInspector />
          <WelcomeOverlay @action="onWelcomeAction" />
          <div v-if="importNextSteps" class="absolute left-3 top-3 z-20 max-w-sm">
            <NextStepCard
              :title="importNextSteps.title"
              :body="importNextSteps.body"
              :actions="importNextSteps.actions"
              @action="handleImportNextStep"
            />
          </div>
          <!-- Bottom-right: shortcuts + locale + theme -->
          <div class="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-lg border border-border bg-panel/90 px-1.5 py-1 backdrop-blur-sm">
            <button
              class="rounded p-1.5 text-muted transition-colors hover:bg-hover hover:text-surface"
              :title="`${t('shortcuts.title')} (Ctrl+?)`"
              @click="shortcutsPanelRef?.toggle()"
            >
              <icon-lucide-keyboard class="size-4" />
            </button>
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>
          <ShortcutsPanel ref="shortcutsPanelRef" />
        </div>
      </SplitterPanel>
      <SplitterResizeHandle class="group relative z-10 -mx-1 w-2 cursor-col-resize">
        <div class="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
      </SplitterResizeHandle>
      <SplitterPanel :default-size="18" :min-size="10" :max-size="30" class="flex min-h-0 flex-col overflow-hidden">
        <div
          class="flex shrink-0 items-center justify-between border-b border-border px-1.5 py-1.5"
        >
          <CollabPanel />
          <UserMenu />
        </div>
        <PropertiesPanel />
      </SplitterPanel>
    </SplitterGroup>

    <!-- Mobile layout -->
    <div
      v-else-if="isMobile && showChrome && store.state.showUI"
      :key="'mobile-' + activeTab?.id"
      class="flex flex-1 overflow-hidden"
    >
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
        <MobileHud
          :collab-state="collab.state.value"
          :collab-peers="collab.remotePeers.value"
          :pending-room-id="pendingRoomId"
          :following-peer="collab.followingPeer.value"
          @share="onShare"
          @join="onJoin"
          @disconnect="onDisconnect"
          @update:collab-name="collab.setLocalName"
          @follow="collab.followPeer"
        />
        <Toolbar />
      </div>
      <MobileDrawer />
    </div>

    <!-- Collapsed UI (showUI=false) -->
    <div
      v-else-if="showChrome"
      :key="'collapsed-' + activeTab?.id"
      class="flex flex-1 overflow-hidden"
    >
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
        <div
          v-if="!isMobile"
          class="absolute top-7 left-7 z-10 flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 shadow-sm"
        >
          <img src="/favicon-32.png" class="size-4" alt="Lutris.ai" />
          <span data-test-id="editor-document-name" class="text-xs text-surface">{{
            store.state.documentName
          }}</span>
          <button
            data-test-id="editor-show-ui"
            class="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
            title="Show UI (⌘\)"
            @click="store.state.showUI = true"
          >
            <icon-lucide-sidebar class="size-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Bare canvas (no chrome, e.g. ?no-chrome) -->
    <div v-else :key="'bare-' + activeTab?.id" class="flex flex-1 overflow-hidden">
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
      </div>
    </div>
  </div>
</template>
