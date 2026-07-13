<script setup lang="ts">
import { useRouter } from 'vue-router'

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
  <div class="min-h-screen bg-[#FBF8F3] text-[#2C2A25]">
    <!-- Nav -->
    <nav class="sticky top-0 z-50 border-b border-[#E8E0D4] bg-[#FBF8F3]/90 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <div class="flex items-center gap-3">
          <img src="/lutris-mascot.png" alt="Lutris.ai" class="h-8 w-auto object-contain rounded-lg" />
          <div>
            <div class="text-sm font-semibold tracking-tight text-[#2C2A25]">Lutris.ai</div>
            <div class="text-[10px] text-[#8B7E6A]">AI design workspace</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="rounded-full border border-[#D4CFC6] px-4 py-2 text-sm text-[#5C5549] transition hover:bg-[#F0EBE3]" @click="openDemo">
            Try Demo
          </button>
          <button class="rounded-full bg-[#3B7A6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#326959]" @click="openEditor">
            Open Editor
          </button>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="mx-auto grid max-w-5xl items-center gap-16 px-6 pb-20 pt-20 lg:grid-cols-[1fr_0.9fr] lg:pt-28">
      <div class="max-w-xl">
        <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-[#3B7A6B]/20 bg-[#3B7A6B]/8 px-3 py-1.5 text-[11px] font-medium text-[#3B7A6B]">
          <span class="size-1.5 rounded-full bg-[#3B7A6B]" />
          Open Source · AI-Native
        </div>
        <h1 class="font-serif text-[44px] font-semibold leading-[1.1] tracking-tight text-[#2C2A25] md:text-[52px]">
          Design with AI,<br />not around it
        </h1>
        <p class="mt-5 max-w-md text-[15px] leading-7 text-[#8B7E6A]">
          Lutris.ai is an AI-native design tool. Describe what you need, import a
          <code class="rounded bg-[#E8E0D4] px-1.5 py-0.5 text-[13px] text-[#5C5549]">.fig</code>
          file, or paste a PRD — then refine on a real canvas with real layers.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <button class="rounded-full bg-[#3B7A6B] px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#326959]" @click="openEditor">
            Open Editor →
          </button>
          <button class="rounded-full border border-[#D4CFC6] px-6 py-3 text-sm text-[#5C5549] transition hover:bg-[#F0EBE3]" @click="openDemo">
            Try Demo
          </button>
        </div>
      </div>

      <!-- Preview mockup -->
      <div class="relative">
        <div class="absolute -inset-6 rounded-[32px] bg-[#3B7A6B]/5 blur-3xl" />
        <div class="relative overflow-hidden rounded-2xl border border-[#E8E0D4] bg-white shadow-xl shadow-[#2C2A25]/5">
          <div class="flex items-center gap-2 border-b border-[#E8E0D4] px-4 py-3 text-[11px] text-[#8B7E6A]">
            <span class="size-2.5 rounded-full bg-[#E8E0D4]" />
            <span class="size-2.5 rounded-full bg-[#E8E0D4]" />
            <span class="size-2.5 rounded-full bg-[#E8E0D4]" />
            <span class="ml-3">Lutris.ai — Editor</span>
          </div>
          <div class="aspect-[16/10] bg-[#FBF8F3] p-4 md:p-5">
            <div class="grid h-full gap-3 rounded-xl border border-[#E8E0D4] bg-white p-3 md:grid-cols-[1.2fr_0.8fr] md:p-4">
              <div class="flex min-h-0 flex-col rounded-xl border border-[#E8E0D4] bg-[#FBF8F3] p-3">
                <div class="mb-3 flex items-center justify-between">
                  <div>
                    <div class="text-[12px] font-medium text-[#2C2A25]">Canvas</div>
                    <div class="text-[10px] text-[#8B7E6A]">Editable design</div>
                  </div>
                  <div class="rounded-full border border-[#E8E0D4] px-2 py-1 text-[10px] text-[#8B7E6A]">.fig / Prompt</div>
                </div>
                <div class="grid flex-1 place-items-center rounded-xl border border-dashed border-[#D4CFC6] bg-white p-3">
                  <div class="aspect-[4/5] w-full max-w-[200px] rounded-xl border border-[#E8E0D4] bg-white p-4 shadow-sm">
                    <div class="mb-3 h-3 w-20 rounded bg-[#E8E0D4]" />
                    <div class="space-y-2">
                      <div class="h-8 rounded-lg bg-[#F0EBE3]" />
                      <div class="h-8 rounded-lg bg-[#F0EBE3]" />
                      <div class="h-14 rounded-xl bg-[#3B7A6B]/10" />
                    </div>
                    <div class="mt-3 h-8 rounded-lg bg-[#3B7A6B] text-center text-[11px] font-medium leading-8 text-white">Primary action</div>
                  </div>
                </div>
              </div>
              <div class="flex min-h-0 flex-col rounded-xl border border-[#E8E0D4] bg-white p-3">
                <div class="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div class="text-[12px] font-medium text-[#2C2A25]">Create</div>
                    <div class="text-[10px] text-[#8B7E6A]">AI workspace</div>
                  </div>
                  <div class="rounded-full border border-[#3B7A6B]/25 bg-[#3B7A6B]/8 px-2 py-1 text-[10px] text-[#3B7A6B]">AI ready</div>
                </div>
                <div class="rounded-xl border border-[#E8E0D4] bg-[#FBF8F3] p-3 text-[11px] leading-5 text-[#5C5549]">
                  Create a pricing page with strong hierarchy and one clear CTA.
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <div class="rounded-full border border-[#E8E0D4] px-2.5 py-1 text-[10px] text-[#8B7E6A]">Landing</div>
                  <div class="rounded-full border border-[#E8E0D4] px-2.5 py-1 text-[10px] text-[#8B7E6A]">Dashboard</div>
                  <div class="rounded-full border border-[#E8E0D4] px-2.5 py-1 text-[10px] text-[#8B7E6A]">Mobile</div>
                </div>
                <div class="mt-auto pt-4">
                  <div class="rounded-xl border border-[#3B7A6B]/15 bg-[#3B7A6B]/5 p-3 text-[11px] text-[#3B7A6B]">
                    ✓ Generated editable layout. Refine or export.
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
        <h2 class="font-serif text-2xl font-semibold text-[#2C2A25]">Three ways to start</h2>
        <p class="mt-2 text-sm text-[#8B7E6A]">Pick whichever fits your workflow. All roads lead to an editable canvas.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        <button
          v-for="path in startPaths"
          :key="path.title"
          class="group rounded-2xl border border-[#E8E0D4] bg-white/60 p-6 text-left transition hover:border-[#3B7A6B]/30 hover:bg-white hover:shadow-md"
          @click="openEditor"
        >
          <div class="mb-3 text-2xl">{{ path.icon }}</div>
          <div class="text-[15px] font-semibold text-[#2C2A25]">{{ path.title }}</div>
          <div class="mt-2 text-[13px] leading-6 text-[#8B7E6A]">{{ path.desc }}</div>
          <div class="mt-4 text-[12px] font-medium text-[#3B7A6B] group-hover:underline">{{ path.cta }} →</div>
        </button>
      </div>
    </section>

    <!-- How it works -->
    <section class="border-y border-[#E8E0D4] bg-white/50 py-24">
      <div class="mx-auto max-w-5xl px-6">
        <div class="mb-12 text-center">
          <h2 class="font-serif text-2xl font-semibold text-[#2C2A25]">How it works</h2>
          <p class="mt-2 text-sm text-[#8B7E6A]">From idea to production in four steps.</p>
        </div>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="w in workflow" :key="w.step" class="relative rounded-2xl border border-[#E8E0D4] bg-[#FBF8F3] p-6">
            <div class="mb-3 text-3xl font-bold text-[#3B7A6B]/20">{{ w.step }}</div>
            <div class="text-[15px] font-semibold text-[#2C2A25]">{{ w.title }}</div>
            <div class="mt-2 text-[13px] leading-6 text-[#8B7E6A]">{{ w.desc }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="mx-auto max-w-5xl px-6 py-24">
      <div class="mb-12 text-center">
        <h2 class="font-serif text-2xl font-semibold text-[#2C2A25]">What's inside</h2>
        <p class="mt-2 text-sm text-[#8B7E6A]">Not a toy. A real design tool with AI at the core.</p>
      </div>
      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="f in features"
          :key="f.title"
          class="rounded-2xl border border-[#E8E0D4] bg-white/60 p-6 transition hover:shadow-sm"
        >
          <div class="mb-3 text-2xl">{{ f.icon }}</div>
          <div class="text-[15px] font-semibold text-[#2C2A25]">{{ f.title }}</div>
          <div class="mt-2 text-[13px] leading-6 text-[#8B7E6A]">{{ f.desc }}</div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="border-t border-[#E8E0D4] bg-white/50 py-20">
      <div class="mx-auto max-w-2xl px-6 text-center">
        <img src="/lutris-mascot.png" alt="Lutris.ai" class="mx-auto mb-6 h-16 w-auto object-contain" />
        <h2 class="font-serif text-3xl font-semibold text-[#2C2A25]">Ready to try?</h2>
        <p class="mt-3 text-[15px] leading-7 text-[#8B7E6A]">
          No sign-up required. Open the editor, bring your own API key, and start designing with AI.
        </p>
        <div class="mt-8 flex justify-center gap-3">
          <button class="rounded-full bg-[#3B7A6B] px-8 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#326959]" @click="openEditor">
            Open Editor →
          </button>
          <a
            href="https://github.com/chancelu/lutris.ai"
            target="_blank"
            rel="noopener"
            class="rounded-full border border-[#D4CFC6] px-6 py-3 text-sm text-[#5C5549] transition hover:bg-[#F0EBE3]"
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-[#E8E0D4] py-8">
      <div class="mx-auto max-w-5xl px-6 text-center text-[12px] text-[#8B7E6A]">
        Built with ♥ by the Lutris.ai team · Open source under MIT
      </div>
    </footer>
  </div>
</template>
