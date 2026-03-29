<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import ProjectSwitcher from './ProjectSwitcher.vue'
import UserMenu from './UserMenu.vue'

defineProps<{
  projectName: string
  projects: Array<{ id: string; name: string }>
  activeProjectId: string | null
}>()

const emit = defineEmits<{
  switchProject: [projectId: string]
  createProject: []
  exportClick: []
}>()

const store = useEditorStore()
const isEditingName = ref(false)
const editName = ref('')

function startEditName() {
  editName.value = store.state.documentName
  isEditingName.value = true
}

function commitName() {
  const trimmed = editName.value.trim()
  if (trimmed) store.state.documentName = trimmed
  isEditingName.value = false
}
</script>

<template>
  <header class="flex h-11 shrink-0 items-center border-b border-border/10 bg-panel px-3">
    <div class="flex items-center gap-2.5">
      <img src="/favicon-32.png" class="size-4 opacity-60" alt="Lutris.ai" />
      <ProjectSwitcher
        :project-name="projectName"
        :projects="projects"
        :active-project-id="activeProjectId"
        @switch="emit('switchProject', $event)"
        @create="emit('createProject')"
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
    <div class="flex-1" />
    <div class="flex items-center gap-2">
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
