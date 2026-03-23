<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRequirements } from '@/composables/use-requirements'
import { useVersions } from '@/composables/use-versions'
import { useRoles } from '@/composables/use-roles'

import type { Requirement } from '@/types/requirements'

const { board, updateStatus } = useRequirements()
const { createMilestoneVersion, latestVersion } = useVersions()
const { canPerform } = useRoles()

export interface ReviewComment {
  id: string
  reqId: string
  nodeId?: string
  author: string
  content: string
  timestamp: number
}

export interface ReviewSession {
  id: string
  versionLabel: string
  timestamp: number
  status: 'pending' | 'approved' | 'changes-requested'
  decisions: Record<string, 'approved' | 'rejected' | 'pending'>
  comments: ReviewComment[]
}

const sessions = ref<ReviewSession[]>([])
const activeSessionId = ref<string | null>(null)
const newComment = ref('')

const activeSession = computed(() =>
  sessions.value.find((s) => s.id === activeSessionId.value) ?? null
)

const canReview = computed(() => canPerform('approveReview'))

function submitForReview(getSceneData: () => string): ReviewSession | null {
  const version = createMilestoneVersion('Review submission', getSceneData)
  if (!version) return null

  const session: ReviewSession = {
    id: `review_${Date.now()}`,
    versionLabel: version.snapshot.label,
    timestamp: Date.now(),
    status: 'pending',
    decisions: Object.fromEntries(
      board.value.requirements.map((r) => [r.id, 'pending' as const])
    ),
    comments: [],
  }
  sessions.value = [...sessions.value, session]
  activeSessionId.value = session.id
  return session
}

function approveRequirement(sessionId: string, reqId: string): void {
  sessions.value = sessions.value.map((s) => {
    if (s.id !== sessionId) return s
    return { ...s, decisions: { ...s.decisions, [reqId]: 'approved' as const } }
  })
  checkSessionComplete(sessionId)
}

function rejectRequirement(sessionId: string, reqId: string): void {
  sessions.value = sessions.value.map((s) => {
    if (s.id !== sessionId) return s
    return { ...s, decisions: { ...s.decisions, [reqId]: 'rejected' as const } }
  })
  checkSessionComplete(sessionId)
}

function checkSessionComplete(sessionId: string): void {
  const session = sessions.value.find((s) => s.id === sessionId)
  if (!session) return
  const decisions = Object.values(session.decisions)
  if (decisions.every((d) => d !== 'pending')) {
    const hasRejected = decisions.some((d) => d === 'rejected')
    sessions.value = sessions.value.map((s) => {
      if (s.id !== sessionId) return s
      return { ...s, status: hasRejected ? 'changes-requested' : 'approved' }
    })
  }
}

function addComment(sessionId: string, reqId: string, content: string, author: string, nodeId?: string): void {
  const comment: ReviewComment = {
    id: `comment_${Date.now()}`,
    reqId,
    nodeId,
    author,
    content,
    timestamp: Date.now(),
  }
  sessions.value = sessions.value.map((s) => {
    if (s.id !== sessionId) return s
    return { ...s, comments: [...s.comments, comment] }
  })
}

const sessionProgress = computed(() => {
  if (!activeSession.value) return { total: 0, decided: 0, approved: 0, rejected: 0 }
  const decisions = Object.values(activeSession.value.decisions)
  return {
    total: decisions.length,
    decided: decisions.filter((d) => d !== 'pending').length,
    approved: decisions.filter((d) => d === 'approved').length,
    rejected: decisions.filter((d) => d === 'rejected').length,
  }
})

const statusColors: Record<string, string> = {
  pending: 'text-amber-400',
  approved: 'text-green-400',
  'changes-requested': 'text-red-400',
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Header -->
    <div class="shrink-0 border-b border-border px-3 py-2">
      <div class="flex items-center justify-between">
        <span class="text-[12px] font-semibold text-surface">Design Review</span>
        <button
          v-if="!activeSession"
          class="rounded bg-accent px-2 py-1 text-[11px] text-white"
          :disabled="board.requirements.length === 0"
          @click="submitForReview(() => '')"
        >
          Submit for Review
        </button>
      </div>
      <!-- Progress -->
      <div v-if="activeSession" class="mt-2">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[11px] font-medium" :class="statusColors[activeSession.status]">
            {{ activeSession.status === 'pending' ? 'In Review' : activeSession.status === 'approved' ? 'Approved' : 'Changes Requested' }}
          </span>
          <span class="text-[10px] text-muted">
            {{ sessionProgress.decided }}/{{ sessionProgress.total }} decided
          </span>
        </div>
        <div class="flex h-1.5 gap-0.5 rounded-full overflow-hidden">
          <div class="bg-green-500 transition-all" :style="{ flex: sessionProgress.approved }" />
          <div class="bg-red-500 transition-all" :style="{ flex: sessionProgress.rejected }" />
          <div class="bg-gray-600 transition-all" :style="{ flex: sessionProgress.total - sessionProgress.decided }" />
        </div>
      </div>
    </div>

    <!-- Session list (when no active session) -->
    <div v-if="!activeSession" class="flex-1 overflow-y-auto p-3">
      <div v-if="sessions.length === 0" class="text-center py-6">
        <icon-lucide-clipboard-check class="mx-auto size-8 text-muted/30 mb-2" />
        <p class="text-[12px] text-muted">No reviews yet</p>
        <p class="text-[11px] text-muted/60">Submit your design for team review</p>
      </div>
      <div
        v-for="s in sessions"
        :key="s.id"
        class="mb-2 cursor-pointer rounded-lg border border-border p-3 hover:bg-hover"
        @click="activeSessionId = s.id"
      >
        <div class="flex items-center justify-between">
          <span class="text-[12px] font-medium text-surface">{{ s.versionLabel }}</span>
          <span class="text-[10px]" :class="statusColors[s.status]">{{ s.status }}</span>
        </div>
        <span class="text-[10px] text-muted">{{ new Date(s.timestamp).toLocaleString() }}</span>
      </div>
    </div>

    <!-- Active review: requirement-by-requirement -->
    <div v-else class="flex-1 overflow-y-auto">
      <button class="w-full border-b border-border px-3 py-1.5 text-left text-[11px] text-muted hover:bg-hover" @click="activeSessionId = null">
        ← Back to reviews
      </button>
      <div v-for="req in board.requirements" :key="req.id" class="border-b border-border px-3 py-2">
        <div class="flex items-center gap-2">
          <span
            class="shrink-0 rounded px-1 text-[9px] font-bold"
            :class="req.priority === 'P0' ? 'bg-red-500/20 text-red-400' : req.priority === 'P1' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'"
          >{{ req.priority }}</span>
          <span class="flex-1 text-[12px] font-medium text-surface">{{ req.title }}</span>
          <!-- Decision badge -->
          <span
            class="text-[10px] font-medium"
            :class="activeSession.decisions[req.id] === 'approved' ? 'text-green-400' : activeSession.decisions[req.id] === 'rejected' ? 'text-red-400' : 'text-muted'"
          >
            {{ activeSession.decisions[req.id] === 'approved' ? '✓' : activeSession.decisions[req.id] === 'rejected' ? '✕' : '○' }}
          </span>
        </div>
        <p v-if="req.description" class="mt-1 text-[10px] text-muted">{{ req.description }}</p>
        <!-- Review actions -->
        <div v-if="canReview" class="mt-1.5 flex gap-1">
          <button
            class="rounded px-2 py-0.5 text-[10px]"
            :class="activeSession.decisions[req.id] === 'approved' ? 'bg-green-500/20 text-green-400' : 'text-muted hover:bg-green-500/10 hover:text-green-400'"
            @click="approveRequirement(activeSession.id, req.id)"
          >Approve</button>
          <button
            class="rounded px-2 py-0.5 text-[10px]"
            :class="activeSession.decisions[req.id] === 'rejected' ? 'bg-red-500/20 text-red-400' : 'text-muted hover:bg-red-500/10 hover:text-red-400'"
            @click="rejectRequirement(activeSession.id, req.id)"
          >Reject</button>
        </div>
        <!-- Comments for this requirement -->
        <div v-if="activeSession.comments.filter(c => c.reqId === req.id).length" class="mt-2 space-y-1">
          <div
            v-for="comment in activeSession.comments.filter(c => c.reqId === req.id)"
            :key="comment.id"
            class="rounded bg-inset/50 px-2 py-1"
          >
            <div class="flex items-center gap-1">
              <span class="text-[10px] font-medium text-surface">{{ comment.author }}</span>
              <span class="text-[9px] text-muted">{{ new Date(comment.timestamp).toLocaleTimeString() }}</span>
            </div>
            <p class="text-[10px] text-muted">{{ comment.content }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
