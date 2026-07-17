<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'
import { useEditorStore } from '@/stores/editor'
import { useProjects } from '@/composables/use-projects'
import { usePipeline } from '@/composables/use-pipeline'
import { useAIChat } from '@/composables/use-chat'
import { useTheme } from '@/composables/use-theme'
import ProjectSwitcher from './ProjectSwitcher.vue'
import UserMenu from './UserMenu.vue'
import PipelinePhaseStepper from './PipelinePhaseStepper.vue'

const { projectName, projects, activeProjectId } = defineProps<{
  projectName: string
  projects: Array<{ id: string; name: string }>
  activeProjectId: string | null
}>()

const emit = defineEmits<{
  switchProject: [projectId: string]
  createProject: []
  deleteProject: [projectId: string]
  exportClick: []
}>()

const store = useEditorStore()
const { renameProject } = useProjects()
const { currentPhase } = usePipeline()
const { inlinePanel } = useAIChat()
const { resolvedTheme, setTheme } = useTheme()

// Explicit dark <-> light switch (no 'system' stop — the menu label promises a mode)
function toggleColorMode() {
  setTheme(resolvedTheme.value === 'light' ? 'dark' : 'light')
}
const isEditingName = ref(false)
const editName = ref('')

// Export is a deliverable action — only meaningful once there is a canvas
// (design/dev), per §3 TopBar.
const showExport = computed(() => currentPhase.value === 'design' || currentPhase.value === 'dev')

function startEditName() {
  editName.value = store.state.documentName
  isEditingName.value = true
}

function commitName() {
  const trimmed = editName.value.trim()
  if (trimmed) {
    store.state.documentName = trimmed
    // Persist to project metadata — without this the rename only lives in
    // in-memory editor state and reverts to the stored project name (e.g.
    // "Untitled Project") on next switchProject/reload.
    if (activeProjectId) void renameProject(activeProjectId, trimmed)
  }
  isEditingName.value = false
}

// The provider settings popover lives in the chat input area — open the same
// panel by switching the right panel back to chat and clicking its trigger.
function openProviderSettings() {
  inlinePanel.value = null
  nextTick(() => {
    document
      .querySelector<HTMLElement>('[data-test-id="provider-settings-trigger"]')
      ?.click()
  })
}
</script>

<template>
  <header class="flex h-12 shrink-0 items-center bg-panel px-3">
    <div class="flex items-center gap-2">
      <img src="/lutris-otter.png" class="h-5 w-auto object-contain" alt="Lutris.ai" />
      <span
        v-if="!isEditingName"
        class="cursor-pointer text-[12px] font-medium text-surface/90 transition hover:text-surface"
        title="Click to rename"
        @click="startEditName"
      >{{ store.state.documentName }}</span>
      <input
        v-else
        v-model="editName"
        class="w-36 rounded bg-transparent px-1 text-[12px] text-surface outline-none ring-1 ring-accent/40 transition-all duration-150"
        @blur="commitName"
        @keydown.enter="commitName"
        @keydown.escape="isEditingName = false"
      />
      <ProjectSwitcher
        :project-name="projectName"
        :projects="projects"
        :active-project-id="activeProjectId"
        @switch="emit('switchProject', $event)"
        @create="emit('createProject')"
        @delete="emit('deleteProject', $event)"
      />
    </div>
    <div class="flex flex-1 items-center justify-center">
      <PipelinePhaseStepper />
    </div>
    <div class="flex items-center gap-1">
      <button
        v-if="showExport"
        data-test-id="topbar-export"
        class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] text-muted transition hover:bg-hover hover:text-surface"
        title="Export"
        @click="emit('exportClick')"
      >
        <icon-lucide-download class="size-3.5" />
        <span>Export</span>
      </button>

      <!-- Settings -->
      <DropdownMenuRoot>
        <DropdownMenuTrigger as-child>
          <button
            data-test-id="topbar-settings"
            class="flex size-7 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-surface"
            title="Settings"
          >
            <icon-lucide-settings class="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            side="bottom"
            :side-offset="8"
            align="end"
            class="z-50 min-w-44 rounded-xl border border-border/30 bg-panel p-1 shadow-xl"
          >
            <DropdownMenuItem
              data-test-id="topbar-settings-provider"
              class="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-muted outline-none transition hover:bg-hover hover:text-surface"
              @select="openProviderSettings"
            >
              <icon-lucide-sparkles class="size-3.5" />
              <span>AI provider settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              data-test-id="topbar-settings-theme"
              class="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-muted outline-none transition hover:bg-hover hover:text-surface"
              @select="toggleColorMode"
            >
              <icon-lucide-moon v-if="resolvedTheme === 'light'" class="size-3.5" />
              <icon-lucide-sun v-else class="size-3.5" />
              <span>{{ resolvedTheme === 'light' ? 'Dark mode' : 'Light mode' }}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>

      <UserMenu />
    </div>
  </header>
</template>
