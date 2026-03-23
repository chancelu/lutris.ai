<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '@/composables/use-i18n'

const store = useEditorStore()
const { t } = useI18n()
const emit = defineEmits<{
  action: [type: 'blank' | 'template' | 'ai' | 'import' | 'import-prd' | 'import-fig' | 'import-code']
}>()

const dismissed = ref(false)

const hasContent = computed(() => {
  void store.state.sceneVersion
  void forceCheck.value
  const pageId = store.state.currentPageId
  if (!pageId) return false
  try {
    const children = store.graph.getChildren(pageId)
    return children.length > 0
  } catch {
    const page = store.graph.nodes.get(pageId)
    return !!(page?.children && page.children.length > 0)
  }
})

const forceCheck = ref(0)
let checkTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  checkTimer = setInterval(() => { forceCheck.value++ }, 500)
})
onUnmounted(() => { if (checkTimer) clearInterval(checkTimer) })

const showOverlay = computed(() => !dismissed.value && !hasContent.value)

function handleAction(type: Parameters<typeof emit>[1]) {
  dismissed.value = true
  emit('action', type)
}
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-200"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showOverlay"
      class="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center"
    >
      <div class="w-full max-w-2xl px-6">
        <div class="text-center mb-8">
          <img src="/mascot-waving.png" alt="Lutris" class="mx-auto mb-3 h-16 w-auto object-contain drop-shadow-md" style="animation: otterBounce 3s ease-in-out infinite" />
          <h2 class="mb-1 text-[16px] font-semibold text-surface">{{ t('welcome.title') }}</h2>
          <p class="text-[13px] text-muted">{{ t('welcome.subtitle') }}</p>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <!-- Enterprise Path (Left) -->
          <div class="rounded-2xl border border-border bg-panel/80 p-5">
            <div class="mb-4 flex items-center gap-2">
              <icon-lucide-building-2 class="size-5 text-blue-400" />
              <h3 class="text-[14px] font-semibold text-surface">企业导入</h3>
            </div>
            <p class="mb-4 text-[12px] text-muted">从现有资产开始，AI 帮你解析和生成</p>
            <div class="flex flex-col gap-2">
              <button
                class="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-blue-400/50 hover:bg-blue-500/5"
                @click="handleAction('import-prd')"
              >
                <icon-lucide-file-text class="size-5 shrink-0 text-blue-400" />
                <div>
                  <div class="text-[13px] font-medium text-surface">导入 PRD</div>
                  <div class="text-[11px] text-muted">Word / Markdown → AI 解析 → 生成设计</div>
                </div>
              </button>
              <button
                class="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-blue-400/50 hover:bg-blue-500/5"
                @click="handleAction('import-fig')"
              >
                <icon-lucide-figma class="size-5 shrink-0 text-purple-400" />
                <div>
                  <div class="text-[13px] font-medium text-surface">导入 .fig 文件</div>
                  <div class="text-[11px] text-muted">打开现有 Figma 设计文件</div>
                </div>
              </button>
              <button
                class="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-blue-400/50 hover:bg-blue-500/5"
                @click="handleAction('import-code')"
              >
                <icon-lucide-code class="size-5 shrink-0 text-green-400" />
                <div>
                  <div class="text-[13px] font-medium text-surface">导入代码</div>
                  <div class="text-[11px] text-muted">从前端代码逆向生成设计</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Blank Path (Right) -->
          <div class="rounded-2xl border border-border bg-panel/80 p-5">
            <div class="mb-4 flex items-center gap-2">
              <icon-lucide-sparkles class="size-5 text-purple-400" />
              <h3 class="text-[14px] font-semibold text-surface">从零开始</h3>
            </div>
            <p class="mb-4 text-[12px] text-muted">用 AI 对话或空白画布开始创作</p>
            <div class="flex flex-col gap-2">
              <button
                class="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-purple-400/50 hover:bg-purple-500/5"
                @click="handleAction('ai')"
              >
                <icon-lucide-message-square class="size-5 shrink-0 text-purple-400" />
                <div>
                  <div class="text-[13px] font-medium text-surface">{{ t('welcome.aiGenerate') }}</div>
                  <div class="text-[11px] text-muted">对话生成 PRD → 设计</div>
                </div>
              </button>
              <button
                class="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-purple-400/50 hover:bg-purple-500/5"
                @click="handleAction('blank')"
              >
                <icon-lucide-file-plus class="size-5 shrink-0 text-gray-400" />
                <div>
                  <div class="text-[13px] font-medium text-surface">空白画布</div>
                  <div class="text-[11px] text-muted">手动设计，自由创作</div>
                </div>
              </button>
              <button
                class="flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-all hover:border-purple-400/50 hover:bg-purple-500/5"
                @click="handleAction('template')"
              >
                <icon-lucide-layout-template class="size-5 shrink-0 text-amber-400" />
                <div>
                  <div class="text-[13px] font-medium text-surface">模板库</div>
                  <div class="text-[11px] text-muted">从预设模板快速开始</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
