<script setup lang="ts">
import { computed } from 'vue'
import { useComments } from '@/composables/use-comments'
import { useEditorStore } from '@/stores/editor'

import type { Comment } from '@/composables/use-comments'

const { comment } = defineProps<{
  comment: Comment
}>()

const store = useEditorStore()
const { activeCommentId, setActiveComment } = useComments()

const isActive = computed(() => activeCommentId.value === comment.id)

// Convert canvas coords to screen coords
const screenX = computed(() => props.comment.x * store.state.zoom + store.state.panX)
const screenY = computed(() => props.comment.y * store.state.zoom + store.state.panY)

function handleClick(e: MouseEvent) {
  e.stopPropagation()
  setActiveComment(isActive.value ? null : props.comment.id)
}
</script>

<template>
  <div
    class="comment-pin absolute z-30 -translate-x-1/2 -translate-y-full cursor-pointer select-none"
    :style="{ left: `${screenX}px`, top: `${screenY}px` }"
    @click="handleClick"
  >
    <!-- Pin icon -->
    <div
      class="flex size-6 items-center justify-center rounded-full shadow-lg transition-transform"
      :class="[
        comment.resolved
          ? 'bg-green-500/80'
          : isActive
            ? 'bg-blue-500 scale-110'
            : 'bg-red-500/90 hover:scale-110',
      ]"
    >
      <span class="text-[11px] font-bold text-white">
        {{ comment.replies.length > 0 ? comment.replies.length + 1 : '💬' }}
      </span>
    </div>

    <!-- Preview tooltip on hover -->
    <div
      v-if="!isActive"
      class="comment-tooltip pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity"
    >
      <span class="font-semibold">{{ comment.author }}:</span> {{ comment.text.slice(0, 40) }}{{ comment.text.length > 40 ? '...' : '' }}
    </div>
  </div>
</template>

<style scoped>
.comment-pin:hover .comment-tooltip {
  opacity: 1;
}
</style>
