<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRequirements } from '@/composables/use-requirements'

const { nodeId, x, y } = defineProps<{
  nodeId: string
  x: number
  y: number
}>()

const emit = defineEmits<{
  close: []
}>()

const { board, linkNodeToRequirement, unlinkNodeFromRequirement, getRequirementsForNode } = useRequirements()

const linkedReqs = computed(() => getRequirementsForNode(nodeId))
const unlinkedReqs = computed(() =>
  board.value.requirements.filter(
    (r) => !r.linkedNodeIds.includes(nodeId)
  )
)

const search = ref('')

const filteredUnlinked = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return unlinkedReqs.value
  return unlinkedReqs.value.filter(
    (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
  )
})

function link(reqId: string) {
  linkNodeToRequirement(nodeId, reqId)
}

function unlink(reqId: string) {
  unlinkNodeFromRequirement(nodeId, reqId)
}

const priorityColors: Record<string, string> = {
  P0: 'bg-red-500/20 text-red-400',
  P1: 'bg-amber-500/20 text-amber-400',
  P2: 'bg-blue-500/20 text-blue-400',
}
</script>

<template>
  <div
    class="fixed z-50 w-64 rounded-xl border border-border bg-panel shadow-xl"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <div class="border-b border-border px-3 py-2">
      <span class="text-[11px] font-semibold text-surface">Link Requirement</span>
    </div>

    <!-- Currently linked -->
    <div v-if="linkedReqs.length" class="border-b border-border px-2 py-1.5">
      <span class="text-[10px] text-muted">Linked</span>
      <div
        v-for="req in linkedReqs"
        :key="req.id"
        class="mt-1 flex items-center gap-1.5 rounded px-1.5 py-1 hover:bg-hover"
      >
        <span class="shrink-0 rounded px-1 text-[9px] font-bold" :class="priorityColors[req.priority]">
          {{ req.priority }}
        </span>
        <span class="flex-1 truncate text-[11px] text-surface">{{ req.title }}</span>
        <button class="text-[10px] text-red-400 hover:text-red-300" @click="unlink(req.id)">✕</button>
      </div>
    </div>

    <!-- Search -->
    <div class="px-2 py-1.5">
      <input
        v-model="search"
        class="w-full rounded border border-border bg-transparent px-2 py-1 text-[11px] text-surface placeholder:text-muted/50 focus:border-accent focus:outline-none"
        placeholder="Search requirements..."
      />
    </div>

    <!-- Available to link -->
    <div class="max-h-40 overflow-y-auto px-2 pb-2">
      <div
        v-for="req in filteredUnlinked"
        :key="req.id"
        class="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 hover:bg-hover"
        @click="link(req.id)"
      >
        <span class="shrink-0 rounded px-1 text-[9px] font-bold" :class="priorityColors[req.priority]">
          {{ req.priority }}
        </span>
        <span class="flex-1 truncate text-[11px] text-muted">{{ req.title }}</span>
        <icon-lucide-plus class="size-3 shrink-0 text-accent" />
      </div>
      <div v-if="!filteredUnlinked.length" class="py-2 text-center text-[10px] text-muted">
        No requirements to link
      </div>
    </div>

    <!-- Close -->
    <div class="border-t border-border px-2 py-1.5 text-right">
      <button class="text-[10px] text-muted hover:text-surface" @click="emit('close')">Close</button>
    </div>
  </div>
</template>
