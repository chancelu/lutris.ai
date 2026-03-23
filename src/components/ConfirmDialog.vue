<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)
const title = ref('')
const message = ref('')
let resolvePromise: ((v: boolean) => void) | null = null

function confirm(t: string, msg: string): Promise<boolean> {
  title.value = t
  message.value = msg
  show.value = true
  return new Promise((resolve) => { resolvePromise = resolve })
}

function handleConfirm() {
  show.value = false
  resolvePromise?.(true)
}

function handleCancel() {
  show.value = false
  resolvePromise?.(false)
}

defineExpose({ confirm })
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="handleCancel"
      >
        <div class="w-80 rounded-xl border border-border bg-panel p-5 shadow-2xl">
          <div class="mb-2 text-sm font-semibold text-surface">{{ title }}</div>
          <div class="mb-4 text-[13px] text-muted">{{ message }}</div>
          <div class="flex justify-end gap-2">
            <button
              class="rounded border border-border px-3 py-1.5 text-[13px] text-muted hover:bg-hover hover:text-surface"
              @click="handleCancel"
            >
              Cancel
            </button>
            <button
              class="rounded bg-red-600 px-3 py-1.5 text-[13px] text-white hover:bg-red-500"
              @click="handleConfirm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
