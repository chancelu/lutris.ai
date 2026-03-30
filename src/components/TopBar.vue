<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
  importClick: []
  exportClick: []
}>()

const store = useEditorStore()
const isEditingName = ref(false)
const editName = ref('')
const settingsOpen = ref(false)
const settingsRef = ref<HTMLElement>()
const settingsMenuStyle = ref({ top: '0px', right: '0px' })

function startEditName() {
  editName.value = store.state.documentName
  isEditingName.value = true
}

function commitName() {
  const trimmed = editName.value.trim()
  if (trimmed) store.state.documentName = trimmed
  isEditingName.value = false
}

function toggleSettings() {
  if (!settingsOpen.value && settingsRef.value) {
    const rect = settingsRef.value.getBoundingClientRect()
    settingsMenuStyle.value = {
      top: `${rect.bottom + 4}px`,
      right: `${window.innerWidth - rect.right}px`
    }
  }
  settingsOpen.value = !settingsOpen.value
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark')
  settingsOpen.value = false
}

function showShortcuts() {
  window.dispatchEvent(new CustomEvent('toggle-shortcuts-panel'))
  settingsOpen.value = false
}

function onDocClick(e: MouseEvent) {
  if (!settingsRef.value?.contains(e.target as Node)) {
    settingsOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
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
    <div class="flex items-center gap-1">
      <button
        class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] text-muted transition hover:bg-hover hover:text-surface"
        title="Import .fig file"
        @click="emit('importClick')"
      >
        <icon-lucide-upload class="size-3.5" />
        <span>Import</span>
      </button>
      <button
        class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] text-muted transition hover:bg-hover hover:text-surface"
        title="Export"
        @click="emit('exportClick')"
      >
        <icon-lucide-download class="size-3.5" />
        <span>Export</span>
      </button>
      <div class="relative">
        <button
          ref="settingsRef"
          class="flex items-center justify-center rounded-md p-1.5 text-muted transition hover:bg-hover hover:text-surface"
          title="Settings"
          @click.stop="toggleSettings"
        >
          <icon-lucide-settings class="size-3.5" />
        </button>
        <Teleport to="body">
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95"
            leave-active-class="transition duration-100 ease-in"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="settingsOpen"
              class="fixed z-[9999] w-48 rounded-lg border border-border bg-panel p-1 shadow-lg"
              :style="settingsMenuStyle"
            >
              <button
                class="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
                @click="toggleTheme"
              >
                <icon-lucide-sun-moon class="size-3.5" />
                Toggle Theme
              </button>
              <button
                class="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
                @click="showShortcuts"
              >
                <icon-lucide-keyboard class="size-3.5" />
                Keyboard Shortcuts
              </button>
            </div>
          </Transition>
        </Teleport>
      </div>
      <UserMenu />
    </div>
  </header>
</template>
