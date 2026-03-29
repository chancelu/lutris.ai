<script setup lang="ts">
import { useImageGen } from '@/composables/use-image-gen'
import { useBrand } from '@/composables/use-brand'

const { apiKey: geminiKey, setApiKey: setGeminiKey } = useImageGen()
const { config, resetBrand } = useBrand()

const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'DM Sans', 'Space Grotesk', 'JetBrains Mono']

function handleLogoUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    config.value = { ...config.value, logoUrl: reader.result as string }
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <div class="p-3">
    <div class="mb-3 flex items-center justify-between">
      <span class="text-xs font-semibold text-surface">Brand Settings</span>
      <button class="text-[11px] text-muted hover:text-surface" @click="resetBrand">Reset</button>
    </div>

    <!-- Logo -->
    <div class="mb-3">
      <div class="mb-1 text-[12px] text-muted">Logo</div>
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded border border-border bg-inset">
          <img v-if="config.logoUrl" :src="config.logoUrl" class="size-8 object-contain" />
          <span v-else class="text-lg text-muted/40">🎨</span>
        </div>
        <label class="cursor-pointer rounded border border-border px-2 py-0.5 text-[12px] text-muted hover:bg-hover hover:text-surface">
          Upload
          <input type="file" accept="image/*" class="hidden" @change="handleLogoUpload" />
        </label>
      </div>
    </div>

    <!-- Primary Color -->
    <div class="mb-3">
      <div class="mb-1 text-[12px] text-muted">Primary Color</div>
      <div class="flex items-center gap-2">
        <input
          :value="config.primaryColor"
          type="color"
          class="size-7 shrink-0 cursor-pointer rounded border border-border"
          @input="(e: Event) => config = { ...config, primaryColor: (e.target as HTMLInputElement).value }"
        />
        <input
          :value="config.primaryColor"
          type="text"
          maxlength="7"
          pattern="#[0-9a-fA-F]{6}"
          class="flex-1 rounded border bg-transparent px-1.5 py-0.5 font-mono text-[13px] text-surface focus:outline-none"
          :class="/^#[0-9a-fA-F]{6}$/.test(config.primaryColor) ? 'border-border' : 'border-red-500/50'"
          @input="(e: Event) => {
            const v = (e.target as HTMLInputElement).value
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) config = { ...config, primaryColor: v }
          }"
        />
      </div>
    </div>

    <!-- Font -->
    <div class="mb-3">
      <div class="mb-1 text-[12px] text-muted">Font</div>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="f in FONTS"
          :key="f"
          class="rounded border px-1.5 py-0.5 text-[11px]"
          :class="config.fontFamily === f ? 'border-blue-500 bg-blue-500/10 text-surface' : 'border-border text-muted hover:text-surface'"
          @click="config = { ...config, fontFamily: f }"
        >
          {{ f }}
        </button>
      </div>
    </div>

    <!-- Gemini API Key -->
    <div class="border-t border-border pt-3">
      <div class="mb-2 text-[12px] font-medium text-surface">AI Image Generation</div>
      <label class="mb-1 block text-[11px] text-muted">Gemini API Key</label>
      <input
        :value="geminiKey"
        type="password"
        placeholder="AIzaSy..."
        class="w-full rounded border border-border bg-input px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:border-accent focus:outline-none"
        @change="setGeminiKey(($event.target as HTMLInputElement).value)"
      />
      <p class="mt-1 text-[10px] text-muted">Powers AI image generation. Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" class="text-accent hover:underline">Google AI Studio</a>.</p>
    </div>
  </div>
</template>
