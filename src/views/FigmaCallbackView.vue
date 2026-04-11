<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useFigmaAuth } from '@/composables/use-figma-auth'

const router = useRouter()
const { handleCallback } = useFigmaAuth()
const error = ref('')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const errParam = params.get('error')

  if (errParam) {
    error.value = `Figma authorization denied: ${errParam}`
    return
  }
  if (!code || !state) {
    error.value = 'Missing authorization code or state'
    return
  }

  try {
    await handleCallback(code, state)
    router.replace('/editor')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'OAuth callback failed'
  }
})
</script>

<template>
  <div class="flex h-screen items-center justify-center bg-canvas">
    <div v-if="error" class="rounded-xl bg-panel px-8 py-6 text-center shadow-lg">
      <p class="text-[14px] text-red-400">{{ error }}</p>
      <button
        class="mt-4 rounded-lg bg-accent/10 px-4 py-2 text-[13px] text-accent hover:bg-accent/20"
        @click="router.replace('/editor')"
      >
        Back to editor
      </button>
    </div>
    <div v-else class="text-[14px] text-muted/60">Connecting to Figma...</div>
  </div>
</template>
