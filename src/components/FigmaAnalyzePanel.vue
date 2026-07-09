<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFigmaAuth } from '@/composables/use-figma-auth'
import { useFigmaAnalyze } from '@/composables/use-figma-analyze'
import { getRecentFiles, type FigmaFileEntry } from '@/lib/figma-client'
import { toast } from '@/composables/use-toast'

const emit = defineEmits<{ close: []; synced: [] }>()

const { isConnected, getToken, startOAuth } = useFigmaAuth()
const { analyzing, progress, error, analysisResult, specMarkdown, analyzeFile, confirmAndSync, afterSyncConfirmed, reset } = useFigmaAnalyze()

const files = ref<FigmaFileEntry[]>([])
const loadingFiles = ref(false)
const manualKey = ref('')
const step = ref<'select' | 'preview' | 'done'>('select')

onMounted(() => {
  if (isConnected.value) loadFiles()
})

async function loadFiles() {
  const token = await getToken()
  if (!token) return
  loadingFiles.value = true
  try {
    files.value = await getRecentFiles(token)
  } catch { /* ignore */ }
  finally { loadingFiles.value = false }
}

async function handleAnalyze(fileKey: string) {
  await analyzeFile(fileKey)
  if (analysisResult.value) step.value = 'preview'
}

function handleSync() {
  const { success, requiresConfirm } = confirmAndSync()
  if (!success) return
  if (requiresConfirm) {
    toast.show('已有 PRD 内容，请在文档面板确认是否覆盖')
    afterSyncConfirmed()
    toast.show('产品规格已同步到 PRD（已覆盖）')
  } else {
    toast.show('产品规格已同步到 PRD')
  }
  step.value = 'done'
  emit('synced')
}

function handleClose() {
  reset()
  step.value = 'select'
  emit('close')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="handleClose">
    <div class="w-full max-w-lg rounded-2xl bg-panel p-6 shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h2 class="text-[16px] font-semibold text-surface">分析 Figma 设计稿</h2>
        <button class="text-muted/40 hover:text-surface" @click="handleClose">
          <icon-lucide-x class="size-5" />
        </button>
      </div>

      <!-- Not connected -->
      <div v-if="!isConnected" class="mt-6 text-center">
        <icon-lucide-figma class="mx-auto size-10 text-muted/30" />
        <p class="mt-3 text-[13px] text-muted/60">请先连接 Figma 账号</p>
        <button class="mt-4 rounded-lg bg-accent px-5 py-2.5 text-[13px] font-medium text-white hover:bg-accent/90" @click="startOAuth()">
          连接 Figma
        </button>
      </div>

      <!-- Step: Select file -->
      <template v-else-if="step === 'select'">
        <!-- Manual key input -->
        <div class="mt-4 flex gap-2">
          <input v-model="manualKey" placeholder="输入 Figma File Key..." class="flex-1 rounded-lg border border-border/30 bg-transparent px-3 py-2 text-[13px] text-surface placeholder:text-muted/30 focus:border-accent focus:outline-none" @keydown.enter="manualKey && handleAnalyze(manualKey)" />
          <button class="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white hover:bg-accent/90 disabled:opacity-40" :disabled="!manualKey || analyzing" @click="handleAnalyze(manualKey)">
            分析
          </button>
        </div>

        <!-- Analyzing indicator -->
        <div v-if="analyzing" class="mt-4 text-center text-[13px] text-muted/60">
          <icon-lucide-loader-2 class="mx-auto mb-2 size-5 animate-spin text-accent" />
          {{ progress }}
        </div>

        <!-- Recent files -->
        <div v-else-if="files.length > 0" class="mt-4">
          <p class="text-[12px] text-muted/50">或选择最近文件</p>
          <div class="mt-2 max-h-60 space-y-1 overflow-y-auto">
            <button v-for="f in files" :key="f.key" class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-surface/5" @click="handleAnalyze(f.key)">
              <img v-if="f.thumbnail_url" :src="f.thumbnail_url" class="size-10 rounded border border-border/20 object-cover" alt="" />
              <div v-else class="flex size-10 items-center justify-center rounded border border-border/20 bg-surface/5">
                <icon-lucide-file class="size-4 text-muted/30" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-[13px] text-surface">{{ f.name }}</p>
                <p class="text-[11px] text-muted/40">{{ formatDate(f.last_modified) }}</p>
              </div>
            </button>
          </div>
        </div>

        <div v-else-if="loadingFiles" class="mt-4 text-center text-[13px] text-muted/60">加载文件列表...</div>
      </template>

      <!-- Step: Preview results -->
      <template v-else-if="step === 'preview' && analysisResult">
        <div class="mt-4 space-y-3">
          <!-- Summary stats -->
          <div class="grid grid-cols-4 gap-2 text-center">
            <div class="rounded-lg bg-surface/5 p-2">
              <p class="text-[18px] font-semibold text-surface">{{ analysisResult.pages.length }}</p>
              <p class="text-[11px] text-muted/50">页面</p>
            </div>
            <div class="rounded-lg bg-surface/5 p-2">
              <p class="text-[18px] font-semibold text-surface">{{ analysisResult.totalScreens }}</p>
              <p class="text-[11px] text-muted/50">屏幕</p>
            </div>
            <div class="rounded-lg bg-surface/5 p-2">
              <p class="text-[18px] font-semibold text-surface">{{ analysisResult.totalComponents }}</p>
              <p class="text-[11px] text-muted/50">组件</p>
            </div>
            <div class="rounded-lg bg-surface/5 p-2">
              <p class="text-[18px] font-semibold text-surface">{{ analysisResult.features.length }}</p>
              <p class="text-[11px] text-muted/50">功能</p>
            </div>
          </div>

          <!-- Feature list -->
          <div v-if="analysisResult.features.length > 0">
            <p class="text-[12px] text-muted/50">识别功能</p>
            <div class="mt-1 flex flex-wrap gap-1.5">
              <span v-for="f in analysisResult.features" :key="f.name" class="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] text-accent">
                {{ f.name }}
              </span>
            </div>
          </div>

          <!-- Markdown preview (collapsed) -->
          <details class="rounded-lg border border-border/20">
            <summary class="cursor-pointer px-3 py-2 text-[12px] text-muted/60 hover:text-surface">查看完整 Markdown</summary>
            <pre class="max-h-48 overflow-auto whitespace-pre-wrap px-3 pb-3 text-[11px] text-muted/80">{{ specMarkdown }}</pre>
          </details>

          <!-- Actions -->
          <div class="flex gap-2">
            <button class="flex-1 rounded-lg border border-border/30 px-4 py-2.5 text-[13px] text-muted/60 hover:text-surface" @click="step = 'select'; reset()">
              重新选择
            </button>
            <button class="flex-1 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-medium text-white hover:bg-accent/90" @click="handleSync">
              同步到 PRD
            </button>
          </div>
        </div>
      </template>

      <!-- Step: Done -->
      <div v-else-if="step === 'done'" class="mt-6 text-center">
        <icon-lucide-check-circle class="mx-auto size-10 text-green-400" />
        <p class="mt-3 text-[13px] text-surface">产品规格已同步</p>
        <p class="mt-1 text-[11px] text-muted/50">请查看 PRD 面板</p>
        <button class="mt-4 rounded-lg border border-border/30 px-5 py-2.5 text-[13px] text-muted/60 hover:text-surface" @click="handleClose">
          关闭
        </button>
      </div>

      <!-- Error -->
      <p v-if="error" class="mt-3 text-center text-[12px] text-red-400">{{ error }}</p>
    </div>
  </div>
</template>
