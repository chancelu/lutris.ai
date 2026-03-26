<script setup lang="ts">
const { title, body, actions } = defineProps<{
  title: string
  body: string
  actions: Array<{ label: string; value: string }>
}>()

const emit = defineEmits<{ action: [value: string] }>()
</script>

<template>
  <div class="rounded-xl border border-border/50 bg-inset/30 px-3 py-2.5">
    <div class="text-[11px] font-medium text-surface">{{ title }}</div>
    <div class="mt-0.5 text-[10px] leading-4 text-muted/80">{{ body }}</div>
    <div class="mt-2 flex flex-wrap gap-1.5">
      <button
        v-for="action in actions"
        :key="action.value"
        class="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted transition hover:bg-hover hover:text-surface"
        @click="emit('action', action.value)"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>
