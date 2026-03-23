<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'

const router = useRouter()
const go = () => router.push('/editor')

// Typewriter
const heroText = 'Design with'
const displayText = ref('')
const showGradient = ref(false)

function typeWriter() {
  let i = 0
  const timer = setInterval(() => {
    if (i < heroText.length) {
      displayText.value = heroText.slice(0, i + 1)
      i++
    } else {
      clearInterval(timer)
      setTimeout(() => { showGradient.value = true }, 200)
    }
  }, 60)
}

// Scroll animations
let observer: IntersectionObserver | null = null
onMounted(() => {
  typeWriter()
  observer = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('animate-in'); observer?.unobserve(e.target) }
    }),
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  )
  document.querySelectorAll('[data-animate]').forEach((el) => observer?.observe(el))
})
onUnmounted(() => observer?.disconnect())

const features = [
  { icon: '✏️', title: 'AI-Powered Design', desc: 'Describe your UI in natural language. AI generates production-ready layouts instantly.' },
  { icon: '📋', title: 'PRD to Design', desc: 'Import product docs, AI parses requirements into structured specs and visual designs.' },
  { icon: '🧩', title: 'Code Export', desc: 'Export to Vue SFC, React components, or raw CSS. Copy-paste ready.' },
  { icon: '🎨', title: 'Design Tokens', desc: 'Extract colors, typography, spacing as JSON or CSS custom properties.' },
  { icon: '🔗', title: 'Figma Bridge', desc: 'Connect to Figma via MCP. Import designs, sync changes bidirectionally.' },
  { icon: '🤝', title: 'Real-time Collab', desc: 'WebRTC peer-to-peer sharing. No server needed. Just share a link.' },
]

const workflow = [
  { step: '01', title: 'Import or Describe', desc: 'Drop a .fig file, paste a PRD, or describe your design to AI.', mascot: '/mascot-waving.png' },
  { step: '02', title: 'Design & Iterate', desc: 'AI generates the layout. Tweak with visual tools or chat commands.', mascot: '/mascot-designing.png' },
  { step: '03', title: 'Handoff & Export', desc: 'Inspect specs, copy code, export assets. Ship it.', mascot: '/mascot-celebrating.png' },
]
</script>

<template>
  <div class="min-h-screen bg-[#FBF8F3] text-[#2D2A26]">
    <!-- Nav -->
    <nav class="fixed top-0 z-50 w-full border-b border-[#E8E0D4] bg-[#FBF8F3]/90 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div class="flex items-center gap-2.5">
          <img src="/lutris-otter.png" alt="Lutris.ai" class="h-9 w-auto object-contain rounded-xl" />
          <span class="text-xl font-bold tracking-tight text-[#2D2A26]" style="font-family: 'Georgia', serif">Lutris.ai</span>
        </div>
        <div class="hidden md:flex items-center gap-8 text-sm text-[#8B7E6A]">
          <a href="#features" class="hover:text-[#2D2A26] transition">Features</a>
          <a href="#workflow" class="hover:text-[#2D2A26] transition">Workflow</a>
          <a href="#export" class="hover:text-[#2D2A26] transition">Export</a>
        </div>
        <button
          class="rounded-full bg-[#3B7A6B] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#2E6355] hover:shadow-lg hover:shadow-[#3B7A6B]/20"
          @click="go"
        >
          Open Editor
        </button>
      </div>
    </nav>

    <!-- Hero -->
    <section class="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16 overflow-hidden">
      <!-- Warm decorative blobs -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute left-1/4 top-1/4 size-[500px] rounded-full bg-[#F0D9B5]/40 blur-[100px]" />
        <div class="absolute right-1/4 top-1/2 size-[400px] rounded-full bg-[#B5D8D0]/30 blur-[100px]" />
        <div class="absolute left-1/2 bottom-1/4 size-[300px] rounded-full bg-[#E8C5A0]/20 blur-[80px]" />
        <!-- Doodle decorations -->
        <svg class="absolute top-20 left-10 text-[#D4C4A8] opacity-40 w-16 h-16" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="8 6"/></svg>
        <svg class="absolute top-40 right-16 text-[#B5D8D0] opacity-40 w-12 h-12" viewBox="0 0 100 100"><path d="M20 80 L50 20 L80 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
        <svg class="absolute bottom-32 left-20 text-[#D4C4A8] opacity-30 w-10 h-10" viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" rx="8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="6 4"/></svg>
      </div>

      <div class="relative z-10 max-w-3xl text-center">
        <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D4C4A8] bg-white/60 px-4 py-1.5 text-sm text-[#8B7E6A] backdrop-blur-sm">
          <span class="size-2 rounded-full bg-[#3B7A6B] animate-pulse" />
          AI-native design tool
        </div>
        <h1 class="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl" style="font-family: 'Georgia', serif">
          {{ displayText }}<span class="animate-blink">|</span>
          <br />
          <Transition enter-active-class="transition-all duration-700 ease-out" enter-from-class="opacity-0 translate-y-4 blur-sm">
            <span v-if="showGradient" class="bg-gradient-to-r from-[#3B7A6B] via-[#D4956A] to-[#C47A5A] bg-clip-text text-transparent">AI superpowers</span>
          </Transition>
        </h1>
        <p class="mb-10 text-lg text-[#8B7E6A] md:text-xl">
          From product requirements to pixel-perfect designs to production code.<br class="hidden md:block" />
          All in one tool. No Figma account needed.
        </p>
        <div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            class="group relative rounded-full bg-[#3B7A6B] px-8 py-3.5 text-base font-medium text-white transition hover:bg-[#2E6355] hover:shadow-lg hover:shadow-[#3B7A6B]/25 animate-glow"
            @click="go"
          >
            Start Designing
            <span class="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
          </button>
          <a href="#features" class="rounded-full border border-[#D4C4A8] bg-white/50 px-8 py-3.5 text-base font-medium text-[#5A5347] transition hover:bg-white/80 backdrop-blur-sm">
            See Features
          </a>
        </div>
      </div>

      <!-- Hero mascot -->
      <div class="relative z-10 mt-12 animate-target" data-animate style="transition-delay: 200ms">
        <img src="/mascot-waving.png" alt="Lutris otter waving" class="mx-auto h-48 md:h-56 w-auto object-contain drop-shadow-xl" />
      </div>

      <!-- Editor preview -->
      <div class="relative z-10 mt-8 w-full max-w-4xl animate-target" data-animate style="transition-delay: 400ms">
        <div class="overflow-hidden rounded-2xl border border-[#E8E0D4] bg-white shadow-2xl shadow-[#D4C4A8]/20">
          <div class="flex items-center gap-2 border-b border-[#F0EBE3] px-4 py-3 bg-[#FAF7F2]">
            <div class="size-3 rounded-full bg-[#E8A0A0]" />
            <div class="size-3 rounded-full bg-[#E8D4A0]" />
            <div class="size-3 rounded-full bg-[#A0D4A8]" />
            <span class="ml-3 text-xs text-[#B0A898]">Lutris.ai — TodoApp.design</span>
          </div>
          <div class="flex h-64 md:h-72">
            <div class="w-44 border-r border-[#F0EBE3] p-3 bg-[#FDFBF8]">
              <div class="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#B0A898]">Layers</div>
              <div v-for="n in ['TodoApp-Screen', '  Header', '  Add-Task', '  Task-List', '    Task-1', '    Task-2', '  Filter-Bar']" :key="n" class="truncate py-0.5 text-xs text-[#8B7E6A]">{{ n }}</div>
            </div>
            <div class="flex flex-1 items-center justify-center bg-[#FEFCF9]">
              <div class="w-40 rounded-xl border border-[#E8E0D4] bg-white p-3 shadow-md">
                <div class="mb-2 h-6 rounded-lg bg-[#3B7A6B]" />
                <div class="mb-1.5 h-3 w-full rounded bg-[#F0EBE3]" />
                <div class="space-y-1.5">
                  <div class="flex items-center gap-1.5">
                    <div class="size-3 rounded border border-[#D4C4A8]" />
                    <div class="h-2.5 flex-1 rounded bg-[#F0EBE3]" />
                    <div class="h-2.5 w-8 rounded bg-[#E8A0A0]/40 text-[6px] text-center leading-[10px] text-[#8B7E6A]">High</div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div class="size-3 rounded border border-[#D4C4A8] bg-[#3B7A6B]/20" />
                    <div class="h-2.5 flex-1 rounded bg-[#F0EBE3]" />
                    <div class="h-2.5 w-8 rounded bg-[#E8D4A0]/40 text-[6px] text-center leading-[10px] text-[#8B7E6A]">Med</div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <div class="size-3 rounded border border-[#D4C4A8]" />
                    <div class="h-2.5 flex-1 rounded bg-[#F0EBE3]" />
                    <div class="h-2.5 w-8 rounded bg-[#A0D4A8]/40 text-[6px] text-center leading-[10px] text-[#8B7E6A]">Low</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="w-52 border-l border-[#F0EBE3] p-3 bg-[#FDFBF8]">
              <div class="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#B0A898]">AI Chat</div>
              <div class="mb-2 rounded-lg bg-[#F5F0E8] p-2 text-[10px] text-[#8B7E6A]">Create a mobile todo app with teal header...</div>
              <div class="rounded-lg bg-[#E8F5F0] p-2 text-[10px] text-[#3B7A6B]">Generated TodoApp with 7 layers ✓</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="mx-auto max-w-6xl px-6 py-28">
      <div class="mb-16 text-center animate-target" data-animate>
        <h2 class="mb-4 text-3xl font-bold md:text-4xl" style="font-family: 'Georgia', serif">Everything you need to ship designs</h2>
        <p class="text-lg text-[#8B7E6A]">No plugins. No subscriptions. Just open and design.</p>
      </div>
      <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(f, i) in features" :key="f.title" data-animate
          class="animate-target group rounded-2xl border border-[#E8E0D4] bg-white/70 p-6 transition hover:border-[#D4C4A8] hover:bg-white hover:shadow-lg hover:shadow-[#D4C4A8]/15 backdrop-blur-sm"
          :style="{ transitionDelay: `${i * 80}ms` }"
        >
          <div class="mb-3 text-2xl">{{ f.icon }}</div>
          <h3 class="mb-2 text-base font-semibold text-[#2D2A26]">{{ f.title }}</h3>
          <p class="text-sm leading-relaxed text-[#8B7E6A]">{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Workflow -->
    <section id="workflow" class="border-t border-[#E8E0D4] bg-[#F5F0E8]">
      <div class="mx-auto max-w-6xl px-6 py-28">
        <div class="mb-16 text-center animate-target" data-animate>
          <h2 class="mb-4 text-3xl font-bold md:text-4xl" style="font-family: 'Georgia', serif">Three steps. That's it.</h2>
          <p class="text-lg text-[#8B7E6A]">From idea to production in minutes, not days.</p>
        </div>
        <div class="grid gap-10 md:grid-cols-3">
          <div v-for="(w, i) in workflow" :key="w.step" class="relative text-center animate-target" data-animate :style="{ transitionDelay: `${i * 150}ms` }">
            <div class="mx-auto mb-4 flex size-28 items-center justify-center">
              <img :src="w.mascot" :alt="w.title" class="h-20 w-auto object-contain drop-shadow-sm" />
            </div>
            <div class="mb-1 text-sm font-bold text-[#3B7A6B]">Step {{ w.step }}</div>
            <h3 class="mb-2 text-lg font-semibold">{{ w.title }}</h3>
            <p class="text-sm leading-relaxed text-[#8B7E6A]">{{ w.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Export -->
    <section id="export" class="mx-auto max-w-6xl px-6 py-28">
      <div class="mb-16 text-center animate-target" data-animate>
        <h2 class="mb-4 text-3xl font-bold md:text-4xl" style="font-family: 'Georgia', serif">Export anything, anywhere</h2>
        <p class="text-lg text-[#8B7E6A]">Your design, your format, your workflow.</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="(fmt, i) in ['Vue SFC', 'React JSX', 'PNG / SVG', 'Design Tokens']" :key="fmt"
          data-animate
          class="flex items-center gap-3 rounded-xl border border-[#E8E0D4] bg-white/70 px-5 py-4 animate-target transition hover:bg-white hover:shadow-md"
          :style="{ transitionDelay: `${i * 80}ms` }"
        >
          <div class="size-2.5 rounded-full bg-[#3B7A6B]" />
          <span class="text-sm font-medium">{{ fmt }}</span>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="border-t border-[#E8E0D4] bg-[#F5F0E8]">
      <div class="mx-auto max-w-3xl px-6 py-28 text-center animate-target" data-animate>
        <img src="/mascot-celebrating.png" alt="Celebrating otter" class="mx-auto mb-6 h-24 w-auto object-contain drop-shadow-lg" />
        <h2 class="mb-4 text-3xl font-bold md:text-4xl" style="font-family: 'Georgia', serif">Ready to design smarter?</h2>
        <p class="mb-8 text-lg text-[#8B7E6A]">Open source. Free forever. No account required.</p>
        <button
          class="group relative rounded-full bg-[#3B7A6B] px-10 py-4 text-lg font-medium text-white transition hover:bg-[#2E6355] hover:shadow-lg hover:shadow-[#3B7A6B]/25 animate-glow"
          @click="go"
        >
          Launch Lutris.ai
          <span class="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-[#E8E0D4] bg-[#FBF8F3] py-8">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-[#B0A898]">
        <span class="flex items-center gap-2">
          <img src="/lutris-otter.png" alt="" class="h-6 w-auto object-contain rounded-lg" />
          Lutris.ai — AI-native design tool
        </span>
        <div class="flex gap-6">
          <a href="https://github.com" class="hover:text-[#5A5347] transition">GitHub</a>
          <a href="#" class="hover:text-[#5A5347] transition">Docs</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.animate-target {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.animate-target.animate-in {
  opacity: 1;
  transform: translateY(0);
}
.animate-blink {
  animation: blink 0.8s step-end infinite;
  color: #3B7A6B;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.animate-glow {
  animation: glow 3s ease-in-out infinite;
}
@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(59, 122, 107, 0.15); }
  50% { box-shadow: 0 0 40px rgba(59, 122, 107, 0.3), 0 0 80px rgba(59, 122, 107, 0.08); }
}
.otter-float {
  animation: otterFloat 4s ease-in-out infinite;
}
@keyframes otterFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
</style>
