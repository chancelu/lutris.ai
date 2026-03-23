<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRequirements } from '@/composables/use-requirements'
import type { Requirement, RequirementStatus, RequirementPriority } from '@/types/requirements'

const {
  board,
  requirementCoverage,
  requirementsByStatus,
  updateStatus,
  deleteRequirement,
  addRequirement,
} = useRequirements()

const filterPriority = ref<RequirementPriority | 'all'>('all')
const expandedReqId = ref<string | null>(null)
const showAddForm = ref(false)
const newReqTitle = ref('')

const columns: { status: RequirementStatus; label: string; color: string }[] = [
  { status: 'draft', label: 'Draft', color: 'text-gray-400' },
  { status: 'approved', label: 'Approved', color: 'text-blue-400' },
  { status: 'in-progress', label: 'In Progress', color: 'text-amber-400' },
  { status: 'designed', label: 'Designed', color: 'text-purple-400' },
  { status: 'delivered', label: 'Delivered', color: 'text-green-400' },
]

const priorityColors: Record<RequirementPriority, string> = {
  P0: 'bg-red-500/20 text-red-400',
  P1: 'bg-amber-500/20 text-amber-400',
  P2: 'bg-blue-500/20 text-blue-400',
}

function filteredReqs(reqs: Requirement[]): Requirement[] {
  if (filterPriority.value === 'all') return reqs
  return reqs.filter((r) => r.priority === filterPriority.value)
}

function toggleExpand(reqId: string) {
  expandedReqId.value = expandedReqId.value === reqId ? null : reqId
}

function handleAdd() {
  if (!newReqTitle.value.trim()) return
  addRequirement(newReqTitle.value.trim())
  newReqTitle.value = ''
  showAddForm.value = false
}

function onDragStart(e: DragEvent, reqId: string) {
  e.dataTransfer?.setData('text/plain', reqId)
}

function onDrop(e: DragEvent, status: RequirementStatus) {
  const reqId = e.dataTransfer?.getData('text/plain')
  if (reqId) updateStatus(reqId, status)
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Header: coverage bar + filters -->
    <div class="shrink-0 border-b border-border px-3 py-2">
      <!-- Coverage bar -->
      <div class="mb-2 flex items-center gap-2">
        <span class="text-[11px] text-muted">Coverage</span>
        <div class="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            class="h-full rounded-full bg-green-500 transition-all"
            :style="{ width: requirementCoverage.percentage + '%' }"
          />
        </div>
        <span class="text-[11px] font-medium text-surface">
          {{ requirementCoverage.linked }}/{{ requirementCoverage.total }}
        </span>
      </div>
      <!-- Filters + Add -->
      <div class="flex items-center gap-1">
        <button
          v-for="p in (['all', 'P0', 'P1', 'P2'] as const)"
          :key="p"
          class="rounded px-1.5 py-0.5 text-[10px] font-medium"
          :class="filterPriority === p ? 'bg-accent/20 text-accent' : 'text-muted hover:text-surface'"
          @click="filterPriority = p"
        >
          {{ p === 'all' ? 'All' : p }}
        </button>
        <button
          class="ml-auto rounded p-1 text-muted hover:bg-hover hover:text-surface"
          @click="showAddForm = !showAddForm"
        >
          <icon-lucide-plus class="size-3.5" />
        </button>
      </div>
      <!-- Add form -->
      <div v-if="showAddForm" class="mt-2 flex gap-1">
        <input
          v-model="newReqTitle"
          class="flex-1 rounded border border-border bg-transparent px-2 py-1 text-[12px] text-surface focus:border-accent focus:outline-none"
          placeholder="Requirement title..."
          @keydown.enter="handleAdd"
        />
        <button
          class="rounded bg-accent px-2 py-1 text-[11px] text-white"
          @click="handleAdd"
        >
          Add
        </button>
      </div>
    </div>

    <!-- Kanban columns (horizontal scroll) -->
    <div class="flex-1 overflow-x-auto overflow-y-hidden">
      <div class="flex h-full gap-2 p-2" style="min-width: max-content">
        <div
          v-for="col in columns"
          :key="col.status"
          class="flex w-44 shrink-0 flex-col rounded-lg bg-inset/50"
          @dragover.prevent
          @drop="onDrop($event, col.status)"
        >
          <!-- Column header -->
          <div class="flex items-center gap-1.5 px-2 py-1.5">
            <span class="text-[11px] font-semibold" :class="col.color">{{ col.label }}</span>
            <span class="text-[10px] text-muted">
              {{ filteredReqs(requirementsByStatus[col.status]).length }}
            </span>
          </div>
          <!-- Cards -->
          <div class="flex-1 overflow-y-auto px-1 pb-1 space-y-1">
            <div
              v-for="req in filteredReqs(requirementsByStatus[col.status])"
              :key="req.id"
              class="rounded-lg border border-border bg-panel p-2 cursor-grab active:cursor-grabbing"
              draggable="true"
              @dragstart="onDragStart($event, req.id)"
              @click="toggleExpand(req.id)"
            >
              <div class="flex items-start gap-1.5">
                <span
                  class="mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold"
                  :class="priorityColors[req.priority]"
                >
                  {{ req.priority }}
                </span>
                <span class="text-[11px] font-medium text-surface leading-tight">{{ req.title }}</span>
              </div>
              <!-- Coverage indicator -->
              <div class="mt-1 flex items-center gap-1">
                <div
                  class="size-1.5 rounded-full"
                  :class="req.linkedNodeIds.length > 0 ? 'bg-green-500' : 'bg-gray-500'"
                />
                <span class="text-[9px] text-muted">
                  {{ req.linkedNodeIds.length }} node{{ req.linkedNodeIds.length !== 1 ? 's' : '' }}
                </span>
              </div>
              <!-- Expanded details -->
              <div v-if="expandedReqId === req.id" class="mt-2 border-t border-border pt-2">
                <p v-if="req.description" class="text-[10px] text-muted mb-1">{{ req.description }}</p>
                <p v-if="req.userStory" class="text-[10px] text-muted/70 italic mb-1">{{ req.userStory }}</p>
                <div v-if="req.acceptanceCriteria.length" class="space-y-0.5">
                  <div
                    v-for="ac in req.acceptanceCriteria"
                    :key="ac.id"
                    class="flex items-start gap-1 text-[10px] text-muted"
                  >
                    <span>{{ ac.met ? '✓' : '○' }}</span>
                    <span>{{ ac.description }}</span>
                  </div>
                </div>
                <button
                  class="mt-1 text-[10px] text-red-400 hover:text-red-300"
                  @click.stop="deleteRequirement(req.id)"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
