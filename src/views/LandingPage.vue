<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const openEditor = () => router.push('/editor')
const openDemo = () => router.push('/demo')

const startPaths = [
  {
    title: 'Prompt',
    desc: 'Describe an interface idea and shape it into editable UI.',
    cta: 'Start from prompt'
  },
  {
    title: '.fig',
    desc: 'Bring existing design work in without starting over.',
    cta: 'Import .fig'
  },
  {
    title: 'PRD',
    desc: 'Turn requirements into a clear design direction first.',
    cta: 'Import PRD'
  }
]
</script>

<template>
  <div class="min-h-screen bg-[#0B0D12] text-white">
    <nav class="sticky top-0 z-50 border-b border-white/10 bg-[#0B0D12]/85 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div class="flex items-center gap-3">
          <img src="/lutris-mascot.png" alt="Lutris.ai" class="size-8 rounded-lg" />
          <div>
            <div class="text-sm font-semibold tracking-tight">Lutris.ai</div>
            <div class="text-[10px] text-white/45">AI design workspace</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5" @click="openDemo">
            Try Demo
          </button>
          <button class="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90" @click="openEditor">
            Open Editor
          </button>
        </div>
      </div>
    </nav>

    <section class="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_0.95fr] lg:py-20">
      <div class="max-w-2xl">
        <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium text-cyan-300">
          <span class="size-2 rounded-full bg-cyan-300" />
          Prompt → Design → Ship
        </div>
        <h1 class="text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
          Turn ideas into editable UI
        </h1>
        <p class="mt-5 max-w-xl text-base leading-7 text-white/62 md:text-lg">
          Start from a prompt, a PRD, or a <code class="rounded bg-white/10 px-1.5 py-0.5 text-white">.fig</code> file — then refine instead of rebuilding.
        </p>
        <div class="mt-7 flex flex-wrap gap-3">
          <button class="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90" @click="openEditor">
            Open Editor
          </button>
          <button class="rounded-full border border-white/15 px-6 py-3 text-sm text-white/80 transition hover:bg-white/5" @click="openDemo">
            Try Demo
          </button>
        </div>

        <div class="mt-8 grid gap-3 sm:grid-cols-3">
          <button
            v-for="path in startPaths"
            :key="path.title"
            class="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
            @click="openEditor"
          >
            <div class="text-[13px] font-semibold text-white">{{ path.title }}</div>
            <div class="mt-1 text-[12px] leading-5 text-white/55">{{ path.desc }}</div>
            <div class="mt-3 text-[11px] text-cyan-300">{{ path.cta }}</div>
          </button>
        </div>
      </div>

      <div class="relative">
        <div class="absolute inset-0 rounded-[28px] bg-gradient-to-br from-cyan-500/14 via-fuchsia-500/10 to-blue-500/14 blur-3xl" />
        <div class="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#10141C] shadow-2xl shadow-black/30">
          <div class="flex items-center gap-2 border-b border-white/8 px-4 py-3 text-[11px] text-white/45">
            <span class="size-2.5 rounded-full bg-red-400/80" />
            <span class="size-2.5 rounded-full bg-amber-400/80" />
            <span class="size-2.5 rounded-full bg-green-400/80" />
            <span class="ml-3">Lutris.ai</span>
          </div>
          <div class="aspect-[16/10] bg-[#0E1218] p-4 md:p-5">
            <div class="grid h-full gap-3 rounded-[22px] border border-white/8 bg-[#0B0F15] p-3 md:grid-cols-[1.2fr_0.8fr] md:p-4">
              <div class="flex min-h-0 flex-col rounded-[18px] border border-white/8 bg-white/[0.02] p-3">
                <div class="mb-3 flex items-center justify-between">
                  <div>
                    <div class="text-[12px] font-medium text-white">Canvas</div>
                    <div class="text-[10px] text-white/40">Editable design</div>
                  </div>
                  <div class="rounded-full border border-white/10 px-2 py-1 text-[10px] text-white/50">.fig / Prompt / PRD</div>
                </div>
                <div class="grid flex-1 place-items-center rounded-[16px] border border-dashed border-white/10 bg-white/[0.02] p-3">
                  <div class="aspect-[4/5] w-full max-w-[220px] rounded-[18px] border border-white/10 bg-[#131A28] p-4 shadow-lg shadow-black/20">
                    <div class="mb-3 h-3 w-24 rounded bg-white/15" />
                    <div class="space-y-2">
                      <div class="h-9 rounded-xl bg-white/7" />
                      <div class="h-9 rounded-xl bg-white/7" />
                      <div class="h-16 rounded-2xl bg-cyan-400/10" />
                    </div>
                    <div class="mt-4 h-9 rounded-xl bg-white text-center text-[11px] font-medium leading-9 text-black">Primary action</div>
                  </div>
                </div>
              </div>

              <div class="flex min-h-0 flex-col rounded-[18px] border border-white/8 bg-[#0F1522] p-3">
                <div class="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div class="text-[12px] font-medium text-white">Create</div>
                    <div class="text-[10px] text-white/40">Prompt workspace</div>
                  </div>
                  <div class="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] text-green-300">AI ready</div>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-5 text-white/65">
                  Create a simple pricing page for an AI product with strong hierarchy and one clear CTA.
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <div class="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/50">Landing</div>
                  <div class="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/50">Dashboard</div>
                  <div class="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/50">Mobile</div>
                </div>
                <div class="mt-auto pt-4">
                  <div class="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 p-3 text-[11px] text-cyan-100">
                    Generated editable layout. Save to spec or keep refining.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
