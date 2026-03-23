<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useImageGen } from '@/composables/use-image-gen'
import { useAIChat } from '@/composables/use-chat'
import { useAISelect } from '@/composables/use-ai-select'
import { useI18n } from '@/composables/use-i18n'

const { generating, error, apiKey, setApiKey } = useImageGen()
const { activeTab, pendingMessage } = useAIChat()
const { aiSelectMode, toggleAISelectMode, addCurrentSelection, hasContext, contextCount } = useAISelect()
const { t } = useI18n()

const showImageDialog = ref(false)
const showFrameMenu = ref(false)
const imagePrompt = ref('')
const inlineKeyInput = ref('')
const rootEl = ref<HTMLElement | null>(null)

const framePresets = [
  { name: 'Desktop (1440×900)', w: 1440, h: 900, label: '🖥️' },
  { name: 'Laptop (1280×800)', w: 1280, h: 800, label: '💻' },
  { name: 'Tablet (768×1024)', w: 768, h: 1024, label: '📱' },
  { name: 'Mobile (375×812)', w: 375, h: 812, label: '📲' },
  { name: 'Mobile SM (320×568)', w: 320, h: 568, label: '📱' },
  { name: 'Custom Frame', w: 400, h: 400, label: '⬜' },
]

function submitImage() {
  if (!imagePrompt.value.trim()) return
  if (!apiKey.value) return
  pendingMessage.value = `Generate an image: ${imagePrompt.value}`
  activeTab.value = 'ai'
  imagePrompt.value = ''
  showImageDialog.value = false
}

function saveInlineKey() {
  const key = inlineKeyInput.value.trim()
  if (!key) return
  setApiKey(key)
  inlineKeyInput.value = ''
}

function createFrame(preset: typeof framePresets[0]) {
  pendingMessage.value = `Create an empty frame named "${preset.name}" with width ${preset.w} and height ${preset.h}`
  activeTab.value = 'ai'
  showFrameMenu.value = false
}

function closePopups() {
  showImageDialog.value = false
  showFrameMenu.value = false
}

function handleClickOutside(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
    closePopups()
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="rootEl" class="absolute bottom-16 left-1/2 z-20 -translate-x-1/2" @click.stop>
    <div class="flex items-center gap-1 rounded-xl border border-white/10 bg-panel/90 px-2 py-1.5 shadow-lg backdrop-blur-sm">
      <!-- AI Select Mode -->
      <button
        class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition"
        :class="aiSelectMode
          ? 'bg-accent/20 text-accent'
          : 'text-muted hover:bg-hover hover:text-surface'"
        title="Select elements for AI editing"
        @click="toggleAISelectMode"
      >
        🎯 <span class="hidden sm:inline">{{ t('quick.aiSelect') }}</span>
      </button>

      <!-- Add current selection -->
      <button
        v-if="aiSelectMode"
        class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-accent transition hover:bg-accent/20"
        title="Add current selection to AI context"
        @click="addCurrentSelection(); activeTab = 'ai'"
      >
        + {{ t('quick.addSelected') }}
      </button>

      <!-- Context badge -->
      <div
        v-if="hasContext"
        class="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent"
      >
        {{ contextCount }} {{ t('quick.selected') }}
      </div>

      <div class="h-4 w-px bg-border" />

      <!-- Generate Image -->
      <div class="relative">
        <button
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] text-muted transition hover:bg-hover hover:text-surface"
          :class="{ 'text-accent': showImageDialog }"
          title="Generate AI Image"
          @click="showImageDialog = !showImageDialog; showFrameMenu = false"
        >
          🖼️ <span class="hidden sm:inline">{{ t('quick.aiImage') }}</span>
        </button>
        <!-- Image prompt popup -->
        <Transition enter-active-class="transition-all duration-150" enter-from-class="opacity-0 translate-y-2" leave-active-class="transition-all duration-100" leave-to-class="opacity-0 translate-y-2">
          <div
            v-if="showImageDialog"
            class="absolute bottom-full left-0 mb-2 w-72 rounded-lg border border-border bg-panel p-3 shadow-xl"
          >
            <div class="mb-2 text-[12px] font-medium text-surface">{{ t('quick.generateImage') }}</div>

            <!-- Inline API Key setup (when no key) -->
            <template v-if="!apiKey">
              <p class="mb-2 text-[11px] text-muted">{{ t('quick.enterKey') }}</p>
              <input
                v-model="inlineKeyInput"
                type="password"
                placeholder="AIzaSy..."
                class="mb-2 w-full rounded border border-border bg-input px-2 py-1.5 text-[13px] text-surface placeholder:text-muted/50 focus:border-accent focus:outline-none"
                @keydown.enter="saveInlineKey"
                @keydown.escape="showImageDialog = false"
              />
              <div class="flex items-center justify-between">
                <a href="https://aistudio.google.com/apikey" target="_blank" class="text-[10px] text-accent hover:underline">{{ t('quick.getKey') }}</a>
                <button
                  :disabled="!inlineKeyInput.trim()"
                  class="rounded bg-accent px-3 py-1 text-[12px] text-white transition hover:bg-accent/80 disabled:opacity-40"
                  @click="saveInlineKey"
                >
                  {{ t('quick.saveKey') }}
                </button>
              </div>
            </template>

            <!-- Normal image prompt (when key exists) -->
            <template v-else>
              <input
                v-model="imagePrompt"
                type="text"
                placeholder="Describe the image you want..."
                class="mb-2 w-full rounded border border-border bg-input px-2 py-1.5 text-[13px] text-surface placeholder:text-muted/50 focus:border-accent focus:outline-none"
                autofocus
                @keydown.enter="submitImage"
                @keydown.escape="showImageDialog = false"
              />
              <div class="flex items-center justify-between">
                <span v-if="error" class="text-[10px] text-red-400">{{ error }}</span>
                <span v-else class="text-[10px] text-muted">{{ t('quick.poweredBy') }}</span>
                <button
                  :disabled="!imagePrompt.trim() || generating"
                  class="rounded bg-accent px-3 py-1 text-[12px] text-white transition hover:bg-accent/80 disabled:opacity-40"
                  @click="submitImage"
                >
                  {{ generating ? t('quick.generating') : t('quick.generate') }}
                </button>
              </div>
            </template>
          </div>
        </Transition>
      </div>

      <div class="h-4 w-px bg-border" />

      <!-- Create Frame -->
      <div class="relative">
        <button
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] text-muted transition hover:bg-hover hover:text-surface"
          :class="{ 'text-accent': showFrameMenu }"
          title="Create New Frame"
          @click="showFrameMenu = !showFrameMenu; showImageDialog = false"
        >
          ⬜ <span class="hidden sm:inline">{{ t('quick.newFrame') }}</span>
        </button>
        <!-- Frame presets popup -->
        <Transition enter-active-class="transition-all duration-150" enter-from-class="opacity-0 translate-y-2" leave-active-class="transition-all duration-100" leave-to-class="opacity-0 translate-y-2">
          <div
            v-if="showFrameMenu"
            class="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-border bg-panel py-1 shadow-xl"
          >
            <button
              v-for="p in framePresets"
              :key="p.name"
              class="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-muted transition hover:bg-hover hover:text-surface"
              @click="createFrame(p)"
            >
              <span>{{ p.label }}</span>
              <span>{{ p.name }}</span>
            </button>
          </div>
        </Transition>
      </div>

      <div class="h-4 w-px bg-border" />

      <!-- Quick AI Chat -->
      <button
        class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] text-muted transition hover:bg-hover hover:text-surface"
        title="Open AI Chat"
        @click="activeTab = 'ai'"
      >
        ✨ <span class="hidden sm:inline">{{ t('quick.aiChat') }}</span>
      </button>
    </div>
  </div>
</template>
