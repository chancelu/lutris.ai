<script setup lang="ts">
import { useImageGen } from '@/composables/use-image-gen'
import { useBrand } from '@/composables/use-brand'

const { apiKey: geminiKey, setApiKey: setGeminiKey } = useImageGen()
const { config, resetBrand, exportBrandCSS } = useBrand()

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

function copyCSS() {
  navigator.clipboard.writeText(exportBrandCSS())
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

    <!-- App Name -->
    <div class="mb-3">
      <div class="mb-1 text-[12px] text-muted">App Name</div>
      <input
        v-model="config.appName"
        type="text"
        class="w-full rounded border border-border bg-transparent px-2 py-1 text-[13px] text-surface focus:border-blue-500 focus:outline-none"
      />
    </div>

    <!-- Tagline -->
    <div class="mb-3">
      <div class="mb-1 text-[12px] text-muted">Tagline</div>
      <input
        v-model="config.tagline"
        type="text"
        class="w-full rounded border border-border bg-transparent px-2 py-1 text-[13px] text-surface focus:border-blue-500 focus:outline-none"
      />
    </div>

    <!-- Colors -->
    <div class="mb-3">
      <div class="mb-1 text-[12px] text-muted">Colors</div>
      <div class="flex flex-col gap-1.5">
        <div v-for="[key, label] in [['primaryColor', 'Primary'], ['secondaryColor', 'Secondary'], ['accentColor', 'Accent']]" :key="key" class="flex items-center gap-2">
          <input
            :value="(config as any)[key]"
            type="color"
            class="size-7 shrink-0 cursor-pointer rounded border border-border"
            @input="(e: Event) => (config as any)[key] = (e.target as HTMLInputElement).value"
          />
          <span class="w-16 shrink-0 text-[12px] text-muted">{{ label }}</span>
          <input
            :value="(config as any)[key]"
            type="text"
            maxlength="7"
            pattern="#[0-9a-fA-F]{6}"
            class="flex-1 rounded border bg-transparent px-1.5 py-0.5 font-mono text-[13px] text-surface focus:outline-none"
            :class="/^#[0-9a-fA-F]{6}$/.test((config as any)[key]) ? 'border-border' : 'border-red-500/50'"
            @input="(e: Event) => {
              const v = (e.target as HTMLInputElement).value
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) (config as any)[key] = v
            }"
          />
        </div>
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
          @click="config.fontFamily = f"
        >
          {{ f }}
        </button>
      </div>
    </div>

    <!-- Border Radius -->
    <div class="mb-3">
      <div class="mb-1 text-[12px] text-muted">Border Radius: {{ config.borderRadius }}px</div>
      <input
        v-model="config.borderRadius"
        type="range"
        min="0"
        max="24"
        class="w-full"
      />
    </div>

    <!-- Preview -->
    <div class="mb-3">
      <div class="mb-1 text-[12px] text-muted">Preview</div>
      <div class="overflow-hidden rounded border border-border" :style="{ background: config.secondaryColor }">
        <!-- Nav bar -->
        <div class="flex items-center gap-3 border-b border-white/10 px-3 py-2">
          <img v-if="config.logoUrl" :src="config.logoUrl" class="size-4 object-contain" />
          <span class="text-[12px] font-bold" :style="{ color: config.primaryColor, fontFamily: config.fontFamily }">
            {{ config.appName }}
          </span>
          <span class="ml-auto text-[11px] text-white/40" :style="{ fontFamily: config.fontFamily }">Home</span>
          <span class="text-[11px] text-white/40" :style="{ fontFamily: config.fontFamily }">Features</span>
          <span class="text-[11px] text-white/40" :style="{ fontFamily: config.fontFamily }">Pricing</span>
        </div>
        <!-- Hero -->
        <div class="px-3 py-4 text-center">
          <div class="text-[14px] font-bold text-white" :style="{ fontFamily: config.fontFamily }">
            {{ config.appName }}
          </div>
          <p class="mt-1 text-[11px] text-white/50" :style="{ fontFamily: config.fontFamily }">{{ config.tagline }}</p>
          <div class="mt-2 flex justify-center gap-2">
            <button
              class="px-3 py-1 text-[11px] text-white"
              :style="{
                background: config.accentColor,
                borderRadius: config.borderRadius + 'px',
                fontFamily: config.fontFamily,
              }"
            >
              Get Started
            </button>
            <button
              class="border px-3 py-1 text-[11px] text-white/60"
              :style="{
                borderColor: config.primaryColor + '40',
                borderRadius: config.borderRadius + 'px',
                fontFamily: config.fontFamily,
              }"
            >
              Learn More
            </button>
          </div>
        </div>
        <!-- Cards -->
        <div class="flex gap-2 px-3 pb-3">
          <div
            v-for="i in 3"
            :key="i"
            class="flex-1 border border-white/10 p-2"
            :style="{ borderRadius: config.borderRadius + 'px' }"
          >
            <div class="mb-1 size-4 rounded-full" :style="{ background: config.accentColor + '30' }" />
            <div class="h-1.5 w-3/4 rounded bg-white/20" />
            <div class="mt-1 h-1 w-full rounded bg-white/10" />
          </div>
        </div>
      </div>
    </div>

    <!-- Export -->
    <button
      class="w-full rounded border border-border py-1 text-[12px] text-muted hover:bg-hover hover:text-surface"
      @click="copyCSS"
    >
      📋 Copy CSS
    </button>

    <!-- Gemini Image Gen API -->
    <div class="mt-4 border-t border-border pt-3">
      <div class="mb-2 text-[12px] font-medium text-surface">🖼️ AI Image Generation</div>
      <label class="mb-1 block text-[11px] text-muted">Gemini API Key</label>
      <input
        :value="geminiKey"
        type="password"
        placeholder="AIzaSy..."
        class="w-full rounded border border-border bg-input px-2 py-1 text-[13px] text-surface placeholder:text-muted/50 focus:border-accent focus:outline-none"
        @change="setGeminiKey(($event.target as HTMLInputElement).value)"
      />
      <p class="mt-1 text-[10px] text-muted">Powers AI image generation in the editor. Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" class="text-accent hover:underline">Google AI Studio</a>.</p>
    </div>
  </div>
</template>
