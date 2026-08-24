<script setup lang="ts">
import { useRouter } from 'vue-router'

import OtterMark from '@/components/OtterMark.vue'

const router = useRouter()
const openEditor = () => router.push('/editor')
const openDemo = () => router.push('/demo')

const startPaths = [
  { title: 'Prompt', desc: 'Describe what you need. AI turns it into editable, layered UI.', cta: 'Start from prompt', icon: '💬' },
  { title: '.fig Import', desc: 'Drop a Figma file and keep iterating — no rebuild needed.', cta: 'Import .fig', icon: '📂' },
  { title: 'PRD', desc: 'Paste your product doc. AI extracts structure and generates screens.', cta: 'Import PRD', icon: '📋' }
]

const features = [
  {
    icon: '🎨',
    title: 'AI Canvas',
    desc: 'A real design canvas powered by Skia. Every element is editable — frames, text, shapes, images. Not a screenshot, not a preview.'
  },
  {
    icon: '⚡',
    title: 'Prompt to UI',
    desc: 'Describe an interface in plain language. AI generates structured, layered JSX that renders as real design nodes on canvas.'
  },
  {
    icon: '🖼️',
    title: 'AI Image Gen',
    desc: 'Need a hero image, icon, or illustration? Generate it inline with Gemini and place it directly on your design.'
  },
  {
    icon: '📐',
    title: '.fig Compatible',
    desc: 'Import .fig files with full layer structure. Bring existing Figma work in and keep refining with AI assistance.'
  },
  {
    icon: '📄',
    title: 'PRD → Design',
    desc: 'Paste a product requirements doc. AI parses it into design direction, then generates matching screens automatically.'
  },
  {
    icon: '🚀',
    title: 'Export Anything',
    desc: 'Export to PNG, SVG, PDF, or production-ready code (Vue, React, Tailwind CSS). From design to deploy in one tool.'
  }
]

const workflow = [
  { step: '01', title: 'Describe', desc: 'Type what you want — a landing page, a dashboard, a mobile screen. Be as vague or specific as you like.' },
  { step: '02', title: 'Generate', desc: 'AI creates a fully editable design on canvas. Real layers, real properties, real design tokens.' },
  { step: '03', title: 'Refine', desc: 'Select any element and tell AI what to change. Or just drag, resize, and edit manually. Your call.' },
  { step: '04', title: 'Ship', desc: 'Export production code, design specs, or hand off to your team. The design is the source of truth.' }
]
</script>

<template>
  <!-- R13 "Deep Space" landing — cold blue-black, glass, electric indigo→cyan gradient.
       Palette mirrors app.css .dark tokens; hardcoded because this page lives
       outside the themed app shell. -->
  <div class="min-h-screen bg-[#07090F] text-[#EEF1F8] antialiased">
    <!-- Nav -->
    <nav class="sticky top-0 z-50 border-b border-white/8 bg-[#07090F]/80 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <div class="flex items-center gap-3">
          <OtterMark :size="30" />
          <div>
            <div class="text-sm font-semibold tracking-tight">Lutris.ai</div>
            <div class="text-[10px] text-[#8B93A7]">AI design workspace</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="rounded-full border border-white/12 px-4 py-2 text-sm text-[#B9C0D4] transition hover:bg-white/6 hover:text-white" @click="openDemo">
            Try Demo
          </button>
          <button
            class="rounded-full bg-gradient-to-br from-[#6E7BFF] to-[#22D3EE] px-4 py-2 text-sm font-medium text-white shadow-[0_4px_24px_rgba(110,123,255,0.35)] transition hover:brightness-110"
            @click="openEditor"
          >
            Open Editor
          </button>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="relative overflow-hidden">
      <!-- Backdrop: grid + glows -->
      <div
        class="pointer-events-none absolute inset-0"
        style="background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 44px 44px; mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%);"
      />
      <div class="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-[#6E7BFF]/18 blur-[120px]" />
      <div class="pointer-events-none absolute top-40 right-[-8rem] h-72 w-72 rounded-full bg-[#22D3EE]/10 blur-[100px]" />

      <div class="relative mx-auto grid max-w-5xl items-center gap-16 px-6 pb-24 pt-20 lg:grid-cols-[1fr_0.9fr] lg:pt-28">
        <div class="max-w-xl">
          <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-[#6E7BFF]/30 bg-[#6E7BFF]/10 px-3 py-1.5 text-[11px] font-medium text-[#A5AEFF]">
            <span class="size-1.5 rounded-full bg-gradient-to-br from-[#6E7BFF] to-[#22D3EE]" />
            Open Source · AI-Native
          </div>
          <h1 class="text-[44px] font-semibold leading-[1.08] tracking-[-0.02em] md:text-[54px]">
            Design with AI,<br />
            <span class="bg-gradient-to-br from-[#6E7BFF] to-[#22D3EE] bg-clip-text text-transparent">not around it</span>
          </h1>
          <p class="mt-5 max-w-md text-[15px] leading-7 text-[#8B93A7]">
            Lutris.ai is an AI-native design tool. Describe what you need, import a
            <code class="rounded border border-white/10 bg-white/6 px-1.5 py-0.5 text-[13px] text-[#B9C0D4]">.fig</code>
            file, or paste a PRD — then refine on a real canvas with real layers.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <button
              class="rounded-full bg-gradient-to-br from-[#6E7BFF] to-[#22D3EE] px-6 py-3 text-sm font-medium text-white shadow-[0_4px_28px_rgba(110,123,255,0.4)] transition hover:brightness-110"
              @click="openEditor"
            >
              Open Editor →
            </button>
            <button class="rounded-full border border-white/12 px-6 py-3 text-sm text-[#B9C0D4] transition hover:bg-white/6 hover:text-white" @click="openDemo">
              Try Demo
            </button>
          </div>
        </div>

        <!-- Preview mockup: dark glass editor -->
        <div class="relative">
          <div class="absolute -inset-8 rounded-[40px] bg-[#6E7BFF]/10 blur-3xl" />
          <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0C0F16]/90 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div class="flex items-center gap-2 border-b border-white/8 px-4 py-3 text-[11px] text-[#8B93A7]">
              <span class="size-2.5 rounded-full bg-white/10" />
              <span class="size-2.5 rounded-full bg-white/10" />
              <span class="size-2.5 rounded-full bg-white/10" />
              <span class="ml-3">Lutris.ai — Editor</span>
            </div>
            <div class="aspect-[16/10] bg-[#07090F] p-4 md:p-5">
              <div class="grid h-full gap-3 rounded-xl border border-white/8 bg-[#0C0F16] p-3 md:grid-cols-[1.2fr_0.8fr] md:p-4">
                <div class="flex min-h-0 flex-col rounded-xl border border-white/8 bg-[#07090F] p-3">
                  <div class="mb-3 flex items-center justify-between">
                    <div>
                      <div class="text-[12px] font-medium">Canvas</div>
                      <div class="text-[10px] text-[#8B93A7]">Editable design</div>
                    </div>
                    <div class="rounded-full border border-white/10 px-2 py-1 text-[10px] text-[#8B93A7]">.fig / Prompt</div>
                  </div>
                  <div class="grid flex-1 place-items-center rounded-xl border border-dashed border-white/12 bg-[#0C0F16] p-3">
                    <div class="aspect-[4/5] w-full max-w-[200px] rounded-xl border border-white/10 bg-[#10141F] p-4 shadow-lg shadow-black/30">
                      <div class="mb-3 h-3 w-20 rounded bg-white/10" />
                      <div class="space-y-2">
                        <div class="h-8 rounded-lg bg-white/6" />
                        <div class="h-8 rounded-lg bg-white/6" />
                        <div class="h-14 rounded-xl bg-gradient-to-br from-[#6E7BFF]/25 to-[#22D3EE]/15" />
                      </div>
                      <div class="mt-3 h-8 rounded-lg bg-gradient-to-br from-[#6E7BFF] to-[#22D3EE] text-center text-[11px] font-medium leading-8 text-white">Primary action</div>
                    </div>
                  </div>
                </div>
                <div class="flex min-h-0 flex-col rounded-xl border border-white/8 bg-[#0C0F16]/60 p-3">
                  <div class="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <div class="text-[12px] font-medium">Create</div>
                      <div class="text-[10px] text-[#8B93A7]">AI workspace</div>
                    </div>
                    <div class="rounded-full border border-[#6E7BFF]/30 bg-[#6E7BFF]/10 px-2 py-1 text-[10px] text-[#A5AEFF]">AI ready</div>
                  </div>
                  <div class="rounded-xl border border-white/8 bg-[#07090F] p-3 text-[11px] leading-5 text-[#B9C0D4]">
                    Create a pricing page with strong hierarchy and one clear CTA.
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <div class="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-[#8B93A7]">Landing</div>
                    <div class="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-[#8B93A7]">Dashboard</div>
                    <div class="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-[#8B93A7]">Mobile</div>
                  </div>
                  <div class="mt-auto pt-4">
                    <div class="rounded-xl border border-[#22D3EE]/25 bg-[#22D3EE]/8 p-3 text-[11px] text-[#7FE3F4]">
                      ✓ Generated editable layout. Refine or export.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3 Start Paths -->
    <section class="mx-auto max-w-5xl px-6 pb-24">
      <div class="mb-8 text-center">
        <h2 class="text-2xl font-semibold tracking-tight">Three ways to start</h2>
        <p class="mt-2 text-sm text-[#8B93A7]">Pick whichever fits your workflow. All roads lead to an editable canvas.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        <button
          v-for="path in startPaths"
          :key="path.title"
          class="group rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-left backdrop-blur-sm transition hover:border-[#6E7BFF]/40 hover:bg-white/[0.05]"
          @click="openEditor"
        >
          <div class="mb-3 text-2xl">{{ path.icon }}</div>
          <div class="text-[15px] font-semibold">{{ path.title }}</div>
          <div class="mt-2 text-[13px] leading-6 text-[#8B93A7]">{{ path.desc }}</div>
          <div class="mt-4 bg-gradient-to-br from-[#6E7BFF] to-[#22D3EE] bg-clip-text text-[12px] font-medium text-transparent group-hover:brightness-125">{{ path.cta }} →</div>
        </button>
      </div>
    </section>

    <!-- How it works -->
    <section class="border-y border-white/8 bg-white/[0.02] py-24">
      <div class="mx-auto max-w-5xl px-6">
        <div class="mb-12 text-center">
          <h2 class="text-2xl font-semibold tracking-tight">How it works</h2>
          <p class="mt-2 text-sm text-[#8B93A7]">From idea to production in four steps.</p>
        </div>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="w in workflow" :key="w.step" class="relative rounded-2xl border border-white/8 bg-[#0C0F16]/60 p-6">
            <div class="mb-3 bg-gradient-to-br from-[#6E7BFF]/50 to-[#22D3EE]/30 bg-clip-text text-3xl font-bold text-transparent">{{ w.step }}</div>
            <div class="text-[15px] font-semibold">{{ w.title }}</div>
            <div class="mt-2 text-[13px] leading-6 text-[#8B93A7]">{{ w.desc }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="mx-auto max-w-5xl px-6 py-24">
      <div class="mb-12 text-center">
        <h2 class="text-2xl font-semibold tracking-tight">What's inside</h2>
        <p class="mt-2 text-sm text-[#8B93A7]">Not a toy. A real design tool with AI at the core.</p>
      </div>
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="f in features"
          :key="f.title"
          class="rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition hover:border-white/16 hover:bg-white/[0.05]"
        >
          <div class="mb-3 text-2xl">{{ f.icon }}</div>
          <div class="text-[15px] font-semibold">{{ f.title }}</div>
          <div class="mt-2 text-[13px] leading-6 text-[#8B93A7]">{{ f.desc }}</div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="relative overflow-hidden border-t border-white/8 py-20">
      <div class="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-[#6E7BFF]/12 blur-[100px]" />
      <div class="relative mx-auto max-w-2xl px-6 text-center">
        <OtterMark :size="64" class="mx-auto mb-6" />
        <h2 class="text-3xl font-semibold tracking-tight">Ready to try?</h2>
        <p class="mt-3 text-[15px] leading-7 text-[#8B93A7]">
          No sign-up required. Open the editor, bring your own API key, and start designing with AI.
        </p>
        <div class="mt-8 flex justify-center gap-3">
          <button
            class="rounded-full bg-gradient-to-br from-[#6E7BFF] to-[#22D3EE] px-8 py-3 text-sm font-medium text-white shadow-[0_4px_28px_rgba(110,123,255,0.4)] transition hover:brightness-110"
            @click="openEditor"
          >
            Open Editor →
          </button>
          <a
            href="https://github.com/chancelu/lutris.ai"
            target="_blank"
            rel="noopener"
            class="rounded-full border border-white/12 px-6 py-3 text-sm text-[#B9C0D4] transition hover:bg-white/6 hover:text-white"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-white/8 py-8">
      <div class="mx-auto max-w-5xl px-6 text-center text-[12px] text-[#8B93A7]">
        Built with ♥ by the Lutris.ai team · Open source under MIT
      </div>
    </footer>
  </div>
</template>
