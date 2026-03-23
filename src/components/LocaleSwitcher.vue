<script setup lang="ts">
import { useI18n } from '@/composables/use-i18n'

const { locale, toggleLocale } = useI18n()
</script>

<template>
  <button
    class="rounded px-1.5 py-0.5 text-[12px] text-muted transition-colors hover:bg-hover hover:text-surface"
    :title="`Language: ${locale === 'en' ? 'English' : '中文'}`"
    @click="toggleLocale"
  >
    {{ locale === 'en' ? 'EN' : '中' }}
  </button>
</template>
