<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useFigmaAuth } from '@/composables/use-figma-auth'
import { getRecentFiles, getFile, type FigmaFileEntry, type FigmaFileResponse } from '@/lib/figma-client'

const { isConnected, getToken, startOAuth, disconnect } = useFigmaAuth()

const emit = defineEmits<{
  import: [file: FigmaFileResponse, name: string]
  close: []
}>()

const files = ref<FigmaFileEntry[]>([])
const loading = ref(false)
const importing = ref<string | null>(null)
const error = ref('')

const showBrowser = computed(() => isConnected.value && files.value.length > 0)

onMounted(() => {
  if (isConnected.value) loadFiles()
})

async function loadFiles() {
  const token = await getToken()
  if (!token) return
  loading.value = true
  error.value = ''
  try {
    files.value = await getRecentFiles(token)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load files'
  } finally {
    loading.value = false
  }
}

async function importFile(entry: FigmaFileEntry) {
  const token = await getToken()
  if (!token) return
  importing.value = entry.key
  error.value = ''
  try {
    const file = await getFile(token, entry.key)
    emit('import', file, entry.name)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to import file'
  } finally {
    importing.value = null
  }
}

function handleDisconnect() {
  disconnect()
  files.value = []
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="emit('close')">
    <div class="w-full max-w-lg rounded-2xl bg-panel p-6 shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-[16px] font-semibold text-surface">Import from Figma</h2>
        <button class="text-muted/40 hover:text-surface" @click="emit('close')">
          <icon-lucide-x class="size-5" />
        </button>
      </div>

      <!-- Not connected -->
      <div v-if="!isConnected" class="mt-6 text-center">
        <icon-lucide-figma class="mx-auto size-10 text-muted/30" />
        <p class="mt-3 text-[13px] text-muted/60">Connect your Figma account to browse and import files</p>
        <button
          class="mt-4 rounded-lg bg-accent px-5 py-2.5 text-[13px] font-medium text-white hover:bg-accent/90"
          @click="startOAuth()"
        >
          Connect Figma
        </button>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="mt-6 text-center text-[13px] text-muted/60">
        Loading your files...
      </div>

      <!-- File list -->
      <div v-else-if="showBrowser" class="mt-4">
        <div class="flex items-center justify-between text-[12px] text-muted/50">
          <span>Recent files</span>
          <button class="hover:text-surface" @click="handleDisconnect">Disconnect</button>
        </div>
        <div class="mt-2 max-h-80 space-y-1 overflow-y-auto">
          <button
            v-for="f in files"
            :key="f.key"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-surface/5"
            :disabled="importing === f.key"
            @click="importFile(f)"
          >
            <img
              v-if="f.thumbnail_url"
              :src="f.thumbnail_url"
              class="size-10 rounded border border-border/20 object-cover"
              alt=""
            />
            <div v-else class="flex size-10 items-center justify-center rounded border border-border/20 bg-surface/5">
              <icon-lucide-file class="size-4 text-muted/30" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13px] text-surface">{{ f.name }}</p>
              <p class="text-[11px] text-muted/40">{{ formatDate(f.last_modified) }}</p>
            </div>
            <span v-if="importing === f.key" class="text-[11px] text-accent">Importing...</span>
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="isConnected && !loading" class="mt-6 text-center">
        <p class="text-[13px] text-muted/60">No recent files found</p>
        <button class="mt-2 text-[12px] text-accent hover:underline" @click="loadFiles">Retry</button>
      </div>

      <!-- Error -->
      <p v-if="error" class="mt-3 text-center text-[12px] text-red-400">{{ error }}</p>
    </div>
  </div>
</template>
