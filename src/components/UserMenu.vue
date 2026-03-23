<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/use-auth'
import { useRouter } from 'vue-router'

const { isLoggedIn, userEmail, signOut } = useAuth()
const router = useRouter()
const open = ref(false)
const triggerRef = ref<HTMLElement>()
const menuStyle = ref({ top: '0px', right: '0px' })

function updatePosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  menuStyle.value = {
    top: `${rect.bottom + 4}px`,
    right: `${window.innerWidth - rect.right}px`
  }
}

function toggle() {
  if (!open.value) updatePosition()
  open.value = !open.value
}

function closeMenu() {
  open.value = false
}

async function handleSignOut() {
  open.value = false
  await signOut()
  router.push('/login')
}

// Close on outside click
function onDocClick(e: MouseEvent) {
  if (!triggerRef.value?.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div v-if="isLoggedIn" class="relative">
    <button
      ref="triggerRef"
      class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-muted transition-colors hover:bg-hover hover:text-surface"
      @click.stop="toggle"
    >
      <div class="flex size-5 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
        {{ userEmail.charAt(0).toUpperCase() }}
      </div>
      <span class="max-w-24 truncate text-xs">{{ userEmail }}</span>
      <icon-lucide-chevron-down class="size-3" />
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="open"
          class="fixed z-[9999] w-48 rounded-lg border border-border bg-panel p-1 shadow-lg"
          :style="menuStyle"
        >
          <div class="truncate px-3 py-2 text-xs text-muted">{{ userEmail }}</div>
          <div class="mx-1 border-t border-border" />
          <button
            class="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs text-muted transition-colors hover:bg-hover hover:text-surface"
            @click="handleSignOut"
          >
            <icon-lucide-log-out class="size-3.5" />
            退出登录
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
