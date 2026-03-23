<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { useComments } from '@/composables/use-comments'
import { useI18n } from '@/composables/use-i18n'

const {
  comments,
  activeComment,
  activeCommentId,
  unresolvedCount,
  isAddingComment,
  currentUser,
  addComment,
  addReply,
  resolveComment,
  deleteComment,
  setActiveComment,
  startAddingComment,
  cancelAddingComment,
  setUsername,
} = useComments()
const { t } = useI18n()
const newCommentText = ref('')
const filter = ref<'all' | 'open' | 'resolved'>('all')

const filteredComments = computed(() => {
  switch (filter.value) {
    case 'open': return comments.value.filter(c => !c.resolved)
    case 'resolved': return comments.value.filter(c => c.resolved)
    default: return comments.value
  }
})

function handleReply() {
  if (!replyText.value.trim() || !activeCommentId.value) return
  addReply(activeCommentId.value, replyText.value.trim())
  replyText.value = ''
}

function handleNewComment() {
  if (!newCommentText.value.trim()) return
  // Place at center of viewport as default position
  addComment(400, 300, newCommentText.value.trim())
  newCommentText.value = ''
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

</script>

<template>
  <div data-test-id="comment-thread-panel" class="flex min-h-0 flex-1 flex-col">
    <!-- Header -->
    <div class="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      <span class="text-xs font-semibold text-surface">{{ t('comments.title') }}</span>
      <span v-if="unresolvedCount > 0" class="rounded-full bg-red-500 px-1.5 text-[11px] text-white">
        {{ unresolvedCount }}
      </span>
      <div class="flex-1" />
      <button
        class="rounded bg-blue-600 px-2 py-0.5 text-[12px] text-white hover:bg-blue-500"
        @click="startAddingComment"
      >
        {{ t('comments.add') }}
      </button>
    </div>

    <!-- Filter bar -->
    <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1">
      <button
        v-for="f in (['all', 'open', 'resolved'] as const)"
        :key="f"
        class="rounded px-2 py-0.5 text-[12px] capitalize"
        :class="filter === f ? 'bg-hover font-semibold text-surface' : 'text-muted hover:text-surface'"
        @click="filter = f"
      >
        {{ f === 'all' ? t('comments.all') : f === 'open' ? t('comments.open') : t('comments.resolved') }}
      </button>
    </div>

    <ScrollAreaRoot class="min-h-0 flex-1">
      <ScrollAreaViewport class="size-full">
        <!-- Active comment detail -->
        <div v-if="activeComment" class="p-3">
          <button
            class="mb-2 text-[12px] text-blue-400 hover:text-blue-300"
            @click="setActiveComment(null)"
          >
            {{ t('comments.backToAll') }}
          </button>

          <!-- Main comment -->
          <div class="rounded border border-border p-2" :class="{ 'opacity-50': activeComment.resolved }">
            <div class="flex items-center justify-between">
              <span class="text-[12px] font-semibold text-surface">{{ activeComment.author }}</span>
              <span class="text-[11px] text-muted">{{ formatTime(activeComment.timestamp) }}</span>
            </div>
            <p class="mt-1 text-[13px] text-muted/90">{{ activeComment.text }}</p>
            <div class="mt-2 flex gap-1.5">
              <button
                class="text-[11px]"
                :class="activeComment.resolved ? 'text-green-400' : 'text-muted hover:text-surface'"
                @click="resolveComment(activeComment.id)"
              >
                {{ activeComment.resolved ? `✅ ${t('comments.resolved')}` : t('comments.resolve2') }}
              </button>
              <button
                class="text-[11px] text-red-400/60 hover:text-red-400"
                @click="deleteComment(activeComment.id)"
              >
                {{ t('comments.delete') }}
              </button>
            </div>
          </div>

          <!-- Replies -->
          <div v-for="reply in activeComment.replies" :key="reply.id" class="ml-4 mt-2 border-l-2 border-border/50 pl-2">
            <div class="flex items-center justify-between">
              <span class="text-[12px] font-semibold text-surface">{{ reply.author }}</span>
              <span class="text-[11px] text-muted">{{ formatTime(reply.timestamp) }}</span>
            </div>
            <p class="mt-0.5 text-[13px] text-muted/90">{{ reply.text }}</p>
          </div>

          <!-- Reply input -->
          <div class="mt-3 flex gap-1.5">
            <input
              v-model="replyText"
              type="text"
              :placeholder="t('comments.reply')"
              class="flex-1 rounded border border-border bg-transparent px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:border-blue-500 focus:outline-none"
              @keydown.enter="handleReply"
            />
            <button
              :disabled="!replyText.trim()"
              class="rounded bg-blue-600 px-2 py-1 text-[12px] text-white hover:bg-blue-500 disabled:opacity-40"
              @click="handleReply"
            >
              {{ t('comments.send') }}
            </button>
          </div>
        </div>

        <!-- Comment list -->
        <div v-else class="p-2">
          <!-- New comment input (when adding) -->
          <div v-if="isAddingComment" class="mb-3 rounded border border-blue-500/50 p-2">
            <p class="mb-1 text-[12px] text-muted">{{ t('comments.clickToPlace') }}</p>
            <div class="flex gap-1.5">
              <input
                v-model="newCommentText"
                type="text"
                :placeholder="t('comments.addPlaceholder')"
                class="flex-1 rounded border border-border bg-transparent px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:border-blue-500 focus:outline-none"
                @keydown.enter="handleNewComment"
              />
              <button
                :disabled="!newCommentText.trim()"
                class="rounded bg-blue-600 px-2 py-1 text-[12px] text-white hover:bg-blue-500 disabled:opacity-40"
                @click="handleNewComment"
              >
                {{ t('comments.add2') }}
              </button>
              <button
                class="rounded border border-border px-2 py-1 text-[12px] text-muted hover:bg-hover"
                @click="cancelAddingComment"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="filteredComments.length === 0" class="px-4 py-8 text-center">
            <icon-lucide-message-circle class="mx-auto size-8 text-muted/30" />
            <p class="mt-2 text-[12px] text-muted">
              {{ filter === 'all' ? t('comments.empty') : filter === 'open' ? t('comments.noOpen') : t('comments.noResolved') }}
            </p>
            <button
              v-if="filter === 'all'"
              class="mt-3 rounded bg-blue-600 px-3 py-1 text-[12px] text-white hover:bg-blue-500"
              @click="startAddingComment"
            >
              {{ t('comments.addFirst') }}
            </button>
          </div>

          <!-- Comment cards -->
          <div
            v-for="c in filteredComments"
            :key="c.id"
            class="mb-1.5 cursor-pointer rounded border border-border/50 p-2 hover:border-border"
            :class="{ 'opacity-50': c.resolved }"
            @click="setActiveComment(c.id)"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-[12px] font-semibold text-surface">{{ c.author }}</span>
                <span v-if="c.resolved" class="text-[11px] text-green-400">✅</span>
              </div>
              <span class="text-[11px] text-muted">{{ formatTime(c.timestamp) }}</span>
            </div>
            <p class="mt-0.5 truncate text-[13px] text-muted/90">{{ c.text }}</p>
            <span v-if="c.replies.length > 0" class="mt-1 text-[11px] text-blue-400">
              {{ c.replies.length }} {{ c.replies.length === 1 ? t('comments.replyCount1') : t('comments.replyCountN') }}
            </span>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/20" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <!-- Username (bottom) -->
    <div class="flex shrink-0 items-center gap-1.5 border-t border-border px-3 py-1.5">
      <span class="text-[11px] text-muted">{{ t('comments.asUser') }}</span>
      <input
        :value="currentUser"
        type="text"
        :placeholder="t('comments.yourName')"
        class="flex-1 rounded border border-border bg-transparent px-1.5 py-0.5 text-[13px] text-surface focus:border-blue-500 focus:outline-none"
        @change="(e: Event) => setUsername((e.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>
