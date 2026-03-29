<script setup lang="ts">
import { ref } from 'vue'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { useProjects } from '@/composables/use-projects'
// eslint-disable-next-line typescript/consistent-type-imports -- used in template
import ConfirmDialog from './ConfirmDialog.vue'

const {
  projects,
  activeProjectId,
  createProject,
  deleteProject,
  switchProject,
} = useProjects()

const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const newProjectName = ref('')
const isCreating = ref(false)

function handleCreate() {
  if (!newProjectName.value.trim()) return
  createProject(newProjectName.value.trim())
  newProjectName.value = ''
  isCreating.value = false
}

async function handleDelete(id: string) {
  const ok = await confirmRef.value?.confirm('Delete Project', 'Delete this project? This cannot be undone.')
  if (ok) deleteProject(id)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex shrink-0 items-center border-b border-border px-3 py-2">
      <span class="text-xs font-semibold text-surface">Projects</span>
    </div>

    <ScrollAreaRoot class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <div class="p-2">
          <!-- New project -->
          <div v-if="isCreating" class="mb-2 rounded border border-blue-500/50 p-2">
            <div class="flex gap-1.5">
              <input
                v-model="newProjectName"
                type="text"
                placeholder="Project name"
                class="flex-1 rounded border border-border bg-transparent px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:border-blue-500 focus:outline-none"
                @keydown.enter="handleCreate"
              />
              <button
                :disabled="!newProjectName.trim()"
                class="rounded bg-blue-600 px-2 py-1 text-[12px] text-white hover:bg-blue-500 disabled:opacity-40"
                @click="handleCreate"
              >
                Create
              </button>
              <button
                class="rounded border border-border px-2 py-1 text-[12px] text-muted hover:bg-hover"
                @click="isCreating = false"
              >
                Cancel
              </button>
            </div>
          </div>
          <button
            v-else
            class="mb-2 w-full rounded border border-dashed border-border py-1.5 text-[12px] text-muted hover:border-blue-500/50 hover:text-surface"
            @click="isCreating = true"
          >
            + New Project
          </button>

          <!-- Project list -->
          <div
            v-for="p in projects"
            :key="p.id"
            class="mb-1.5 cursor-pointer rounded border p-2 transition-colors"
            :class="p.id === activeProjectId ? 'border-blue-500/50 bg-blue-500/5' : 'border-border/50 hover:border-border'"
            @click="switchProject(p.id)"
          >
            <div class="flex items-center justify-between">
              <span class="text-[12px] font-semibold text-surface">{{ p.name }}</span>
              <button
                v-if="projects.length > 1"
                class="text-[11px] text-red-400/60 hover:text-red-400"
                @click.stop="handleDelete(p.id)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>
