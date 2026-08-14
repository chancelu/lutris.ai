<script setup lang="ts">
import { computed, ref } from 'vue'
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
import OtterMark from './OtterMark.vue'

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
// Delay past the dropdown's close animation/dismiss layer, otherwise the
// programmatic click is swallowed as an outside interaction and the popover
// never opens.
function openProviderSettings() {
  inlinePanel.value = null
  setTimeout(() => {
    document
      .querySelector<HTMLElement>('[data-test-id="provider-settings-trigger"]')
      ?.click()
  }, 150)
}
</script>

<template>
  <!-- R14: 悬浮玻璃顶栏——三段 pill 浮在画布上方（Framer 式），不占布局行高。
       父级用 absolute inset-x-3 top-3 放置；pointer-events 由父级裁剪。 -->
  <header class="pointer-events-none flex items-center justify-between gap-3">
    <!-- Left: brand + project -->
    <div class="glass pointer-events-auto flex items-center gap-2 rounded-full border border-border/40 py-1.5 pl-2 pr-3 shadow-xl shadow-black/25">
      <span class="flex items-center gap-2">
        <OtterMark :size="20" />
        <span class="font-display text-[14px] font-semibold tracking-tight text-surface">Lutris</span>
      </span>
      <span class="h-3.5 w-px bg-border" />
      <span
        v-if="!isEditingName"
        class="cursor-pointer text-[12px] text-muted transition hover:text-surface"
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

    <!-- Center: pipeline stepper -->
    <div class="pointer-events-auto flex min-w-0 items-center justify-center">
      <PipelinePhaseStepper />
    </div>

    <!-- Right: actions -->
    <div class="glass pointer-events-auto flex items-center gap-0.5 rounded-full border border-border/40 px-1.5 py-1 shadow-xl shadow-black/25">
      <button
        v-if="showExport"
        data-test-id="topbar-export"
        class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] text-muted transition hover:bg-hover hover:text-surface"
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
            class="flex size-7 items-center justify-center rounded-full text-muted transition hover:bg-hover hover:text-surface"
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
            class="glass z-50 min-w-44 rounded-xl border border-border p-1 shadow-xl"
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
