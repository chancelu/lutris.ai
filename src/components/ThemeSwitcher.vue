<script setup lang="ts">
import { useTheme } from '@/composables/use-theme'

const { resolvedTheme, setTheme } = useTheme()

function toggleTheme() {
  setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark')
}
</script>

<template>
  <button
    class="rounded px-1.5 py-0.5 text-[12px] text-muted transition-colors hover:bg-hover hover:text-surface"
    :title="resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    {{ resolvedTheme === 'dark' ? '🌙' : '☀️' }}
  </button>
</template>
