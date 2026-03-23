<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@unhead/vue'

import AppToast from '@/components/AppToast.vue'
import { toast } from '@/composables/use-toast'

useHead({ titleTemplate: (title) => (title ? `${title} — Lutris.ai` : 'Lutris.ai') })

onMounted(() => {
  toast.setupGlobalErrorHandler()
  // Remove the static loader from index.html
  const loader = document.getElementById('loader')
  if (loader) {
    loader.classList.add('fade-out')
    setTimeout(() => loader.remove(), 300)
  }
})
</script>

<template>
  <RouterView />
  <AppToast />
</template>
