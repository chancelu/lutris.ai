<script setup lang="ts">
import { ref, computed } from 'vue'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { useProjects } from '@/composables/use-projects'
// eslint-disable-next-line typescript/consistent-type-imports -- used in template
import ConfirmDialog from './ConfirmDialog.vue'

const {
  projects,
  activeProject,
  activeSnapshots,
  activeProjectId,
  isSaving,
  lastSavedAt,
  createProject,
  deleteProject,
  renameProject,
  switchProject,
  createSnapshot,
  restoreSnapshot,
  deleteSnapshot,
} = useProjects()
const activeSection = ref<'projects' | 'history'>('projects')
const newProjectName = ref('')
const isCreating = ref(false)
const editingId = ref<string | null>(null)
const editName = ref('')
const snapshotLabel = ref('')

function handleCreate() {
  if (!newProjectName.value.trim()) return
  createProject(newProjectName.value.trim())
  newProjectName.value = ''
  isCreating.value = false
}

function startRename(id: string, name: string) {
  editingId.value = id
  editName.value = name
}

function saveRename() {
  if (editingId.value && editName.value.trim()) {
    renameProject(editingId.value, editName.value.trim())
  }
  editingId.value = null
}

function handleSnapshot() {
  createSnapshot(snapshotLabel.value.trim() || undefined)
  snapshotLabel.value = ''
}

async function handleRestore(id: number) {
  const ok = await confirmRef.value?.confirm('Restore Version', 'Restore this version? Current unsaved changes will be lost.')
  if (ok) restoreSnapshot(id)
}

async function handleDeleteProject(id: string) {
  const ok = await confirmRef.value?.confirm('Delete Project', 'Delete this project? This cannot be undone.')
  if (ok) deleteProject(id)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return formatTime(ts)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- Header with auto-save indicator -->
    <div class="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      <span class="text-xs font-semibold text-surface">
        {{ activeProject?.name ?? 'No project' }}
      </span>
      <span v-if="isSaving" class="text-[11px] text-green-400 animate-pulse">Saving...</span>
      <span v-else-if="lastSavedAt" class="text-[11px] text-muted">
        Saved {{ formatRelative(lastSavedAt) }}
      </span>
    </div>

    <!-- Section tabs -->
    <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
      <button
        v-for="sec in (['projects', 'history'] as const)"
        :key="sec"
        class="rounded px-2 py-0.5 text-[12px] capitalize"
        :class="activeSection === sec ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
        @click="activeSection = sec"
      >
        {{ sec === 'projects' ? 'Projects' : 'History' }}
      </button>
    </div>

    <ScrollAreaRoot class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <!-- Projects list -->
        <div v-if="activeSection === 'projects'" class="p-2">
          <!-- New project -->
          <div v-if="isCreating" class="mb-2 rounded border border-blue-500/50 p-2">
            <div class="flex gap-1.5">
              <input
                v-model="newProjectName"
                type="text"
                :placeholder="'Project name'"
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
                ✕
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

          <!-- Project cards -->
          <div
            v-for="p in projects"
            :key="p.id"
            class="mb-1.5 cursor-pointer rounded border p-2 transition-colors"
            :class="p.id === activeProjectId ? 'border-blue-500/50 bg-blue-500/5' : 'border-border/50 hover:border-border'"
            @click="switchProject(p.id)"
          >
            <div class="flex items-center justify-between">
              <!-- Inline rename -->
              <template v-if="editingId === p.id">
                <input
                  v-model="editName"
                  class="flex-1 rounded border border-border bg-transparent px-1 py-0.5 text-[13px] text-surface focus:border-blue-500 focus:outline-none"
                  @keydown.enter="saveRename"
                  @blur="saveRename"
                  @click.stop
                />
              </template>
              <template v-else>
                <span class="text-[12px] font-semibold text-surface">{{ p.name }}</span>
              </template>
              <div class="flex items-center gap-1" @click.stop>
                <button
                  class="text-[11px] text-muted hover:text-surface"
                  @click="startRename(p.id, p.name)"
                >
                  ✏️
                </button>
                <button
                  v-if="projects.length > 1"
                  class="text-[11px] text-red-400/60 hover:text-red-400"
                  @click="handleDeleteProject(p.id)"
                >
                  🗑
                </button>
              </div>
            </div>
            <div class="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
              <span>{{ p.snapshots.length }} versions</span>
              <span>Updated {{ formatRelative(p.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Version history -->
        <div v-if="activeSection === 'history'" class="p-2">
          <!-- Create snapshot -->
          <div class="mb-3 flex gap-1.5">
            <input
              v-model="snapshotLabel"
              type="text"
              :placeholder="'Version label'"
              class="flex-1 rounded border border-border bg-transparent px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:border-blue-500 focus:outline-none"
              @keydown.enter="handleSnapshot"
            />
            <button
              class="rounded bg-green-600 px-2 py-1 text-[12px] text-white hover:bg-green-500"
              @click="handleSnapshot"
            >
              Save Version
            </button>
          </div>

          <div v-if="activeSnapshots.length === 0" class="px-4 py-8 text-center">
            <span class="text-[12px] text-muted">No versions yet</span>
          </div>

          <div
            v-for="s in [...activeSnapshots].reverse()"
            :key="s.id"
            class="mb-1.5 rounded border border-border/50 p-2"
          >
            <div class="flex items-center justify-between">
              <span class="text-[12px] font-semibold text-surface">{{ s.label }}</span>
              <span class="text-[11px] text-muted">{{ formatTime(s.timestamp) }}</span>
            </div>
            <div class="mt-1 flex gap-1.5">
              <button
                class="text-[11px] text-blue-400 hover:text-blue-300"
                @click="handleRestore(s.id)"
              >
                Restore
              </button>
              <button
                class="text-[11px] text-red-400/60 hover:text-red-400"
                @click="deleteSnapshot(s.id)"
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
