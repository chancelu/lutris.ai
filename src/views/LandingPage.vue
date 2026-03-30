<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const openEditor = () => router.push('/editor')
const openDemo = () => router.push('/demo')

const startPaths = [
  {
    title: 'Prompt',
    desc: 'Describe an interface idea and shape it into editable UI.',
    cta: 'Start from prompt',
    icon: '💬'
  },
  {
    title: '.fig',
    desc: 'Bring existing design work in without starting over.',
    cta: 'Import .fig',
    icon: '📂'
  },
  {
    title: 'PRD',
    desc: 'Turn requirements into a clear design direction first.',
    cta: 'Import PRD',
    icon: '📋'
  }
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
          <button
            class="rounded-full border border-[#D4CFC6] px-4 py-2 text-sm text-[#5C5549] transition hover:bg-[#F0EBE3]"
            @click="openDemo"
          >
            Try Demo
          </button>
          <button
            class="rounded-full bg-[#3B7A6B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#326959]"
            @click="openEditor"
          >
            Open Editor
          </button>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="mx-auto grid min-h-[calc(100vh-64px)] max-w-5xl items-center gap-16 px-6 py-16 lg:grid-cols-[1fr_0.9fr] lg:py-20">
      <div class="max-w-xl">
        <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-[#3B7A6B]/20 bg-[#3B7A6B]/8 px-3 py-1.5 text-[11px] font-medium text-[#3B7A6B]">
          <span class="size-1.5 rounded-full bg-[#3B7A6B]" />
          Prompt → Design → Ship
        </div>
        <h1 class="font-serif text-[44px] font-semibold leading-[1.1] tracking-tight text-[#2C2A25] md:text-[52px]">
          Turn ideas into<br />editable UI
        </h1>
        <p class="mt-5 max-w-md text-[15px] leading-7 text-[#8B7E6A]">
          Start from a prompt, a PRD, or a
          <code class="rounded bg-[#E8E0D4] px-1.5 py-0.5 text-[13px] text-[#5C5549]">.fig</code>
          file — then refine instead of rebuilding.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <button
            class="rounded-full bg-[#3B7A6B] px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#326959]"
            @click="openEditor"
          >
            Open Editor
          </button>
          <button
            class="rounded-full border border-[#D4CFC6] px-6 py-3 text-sm text-[#5C5549] transition hover:bg-[#F0EBE3]"
            @click="openDemo"
          >
            Try Demo
          </button>
        </div>

        <!-- Start paths -->
        <div class="mt-10 grid gap-3 sm:grid-cols-3">
          <button
            v-for="path in startPaths"
            :key="path.title"
            class="group rounded-2xl border border-[#E8E0D4] bg-white/60 p-4 text-left transition hover:border-[#3B7A6B]/30 hover:bg-white hover:shadow-sm"
            @click="openEditor"
          >
            <div class="mb-2 text-lg">{{ path.icon }}</div>
            <div class="text-[13px] font-semibold text-[#2C2A25]">{{ path.title }}</div>
            <div class="mt-1 text-[12px] leading-5 text-[#8B7E6A]">{{ path.desc }}</div>
            <div class="mt-3 text-[11px] font-medium text-[#3B7A6B] group-hover:underline">{{ path.cta }} →</div>
          </button>
        </div>
      </div>

      <!-- Preview mockup -->
      <div class="relative">
        <div class="absolute -inset-6 rounded-[32px] bg-[#3B7A6B]/5 blur-3xl" />
        <div class="relative overflow-hidden rounded-2xl border border-[#E8E0D4] bg-white shadow-xl shadow-[#2C2A25]/5">
          <!-- Window chrome -->
          <div class="flex items-center gap-2 border-b border-[#E8E0D4] px-4 py-3 text-[11px] text-[#8B7E6A]">
            <span class="size-2.5 rounded-full bg-[#E8E0D4]" />
            <span class="size-2.5 rounded-full bg-[#E8E0D4]" />
            <span class="size-2.5 rounded-full bg-[#E8E0D4]" />
            <span class="ml-3">Lutris.ai — Editor</span>
          </div>
          <!-- Editor mockup -->
          <div class="aspect-[16/10] bg-[#FBF8F3] p-4 md:p-5">
            <div class="grid h-full gap-3 rounded-xl border border-[#E8E0D4] bg-white p-3 md:grid-cols-[1.2fr_0.8fr] md:p-4">
              <!-- Canvas side -->
              <div class="flex min-h-0 flex-col rounded-xl border border-[#E8E0D4] bg-[#FBF8F3] p-3">
                <div class="mb-3 flex items-center justify-between">
                  <div>
                    <div class="text-[12px] font-medium text-[#2C2A25]">Canvas</div>
                    <div class="text-[10px] text-[#8B7E6A]">Editable design</div>
                  </div>
                  <div class="rounded-full border border-[#E8E0D4] px-2 py-1 text-[10px] text-[#8B7E6A]">.fig / Prompt / PRD</div>
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
              <!-- AI side -->
              <div class="flex min-h-0 flex-col rounded-xl border border-[#E8E0D4] bg-white p-3">
                <div class="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div class="text-[12px] font-medium text-[#2C2A25]">Create</div>
                    <div class="text-[10px] text-[#8B7E6A]">Prompt workspace</div>
                  </div>
                  <div class="rounded-full border border-[#3B7A6B]/25 bg-[#3B7A6B]/8 px-2 py-1 text-[10px] text-[#3B7A6B]">AI ready</div>
                </div>
                <div class="rounded-xl border border-[#E8E0D4] bg-[#FBF8F3] p-3 text-[11px] leading-5 text-[#5C5549]">
                  Create a simple pricing page for an AI product with strong hierarchy and one clear CTA.
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <div class="rounded-full border border-[#E8E0D4] px-2.5 py-1 text-[10px] text-[#8B7E6A]">Landing</div>
                  <div class="rounded-full border border-[#E8E0D4] px-2.5 py-1 text-[10px] text-[#8B7E6A]">Dashboard</div>
                  <div class="rounded-full border border-[#E8E0D4] px-2.5 py-1 text-[10px] text-[#8B7E6A]">Mobile</div>
                </div>
                <div class="mt-auto pt-4">
                  <div class="rounded-xl border border-[#3B7A6B]/15 bg-[#3B7A6B]/5 p-3 text-[11px] text-[#3B7A6B]">
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
