<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useProjects } from '@/composables/use-projects'
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
const isEditingName = ref(false)
const editName = ref('')

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
</script>

<template>
  <header class="flex h-12 shrink-0 items-center bg-panel px-3 shadow-sm shadow-black/5">
    <div class="flex items-center gap-2.5">
      <img src="/lutris-mascot.png" class="h-5 w-auto object-contain opacity-70" alt="Lutris.ai" />
      <span class="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">AI</span>
      <ProjectSwitcher
        :project-name="projectName"
        :projects="projects"
        :active-project-id="activeProjectId"
        @switch="emit('switchProject', $event)"
        @create="emit('createProject')"
        @delete="emit('deleteProject', $event)"
      />
      <span class="text-border/30">/</span>
      <span
        v-if="!isEditingName"
        class="cursor-pointer text-[12px] text-muted transition hover:text-surface"
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
    </div>
    <div class="flex flex-1 items-center justify-center">
      <PipelinePhaseStepper />
    </div>
    <div class="flex items-center gap-1">
      <button
        class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] text-muted transition hover:bg-hover hover:text-surface"
        title="Export"
        @click="emit('exportClick')"
      >
        <icon-lucide-download class="size-3.5" />
        <span>Export</span>
      </button>
      <UserMenu />
    </div>
  </header>
</template>
