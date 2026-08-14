<script setup lang="ts">
import { ref } from 'vue'

import LayersPanel from './LayersPanel.vue'
import Toolbar from './Toolbar.vue'

// R15: 底部居中悬浮工具 dock（Framer/Lovart 式）= 横向工具组 + 图层开关。
// 点击 layers 图标在 dock 上方弹出悬浮玻璃图层面板，再次点击（或 chevron）收起。
// R14 的左侧竖 rail 已废弃——底部居中对双手和鼠标都更顺手。
const panelOpen = ref(false)

function toggleLayers() {
  panelOpen.value = !panelOpen.value
}
</script>

<template>
  <div class="relative flex flex-col items-center">
    <!-- 悬浮图层面板（dock 上方弹出） -->
    <Transition
      enter-active-class="transition-all duration-150"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition-all duration-100"
      leave-to-class="opacity-0 translate-y-2"
    >
      <aside
        v-if="panelOpen"
        data-test-id="left-sidebar"
        class="glass absolute bottom-full mb-2 flex h-[min(480px,calc(100vh-220px))] w-[264px] flex-col overflow-hidden rounded-2xl border border-border/40 shadow-xl shadow-black/25"
      >
        <div class="flex shrink-0 items-center gap-1.5 px-3 py-2">
          <icon-lucide-layers class="size-3.5 text-accent" />
          <span class="text-[11px] font-medium text-surface">Layers</span>
          <div class="flex-1" />
          <button
            data-test-id="left-sidebar-collapse"
            class="flex size-6 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-surface"
            title="Collapse layers"
            @click="panelOpen = false"
          >
            <icon-lucide-chevrons-down class="size-3.5" />
          </button>
        </div>
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <LayersPanel @collapse="panelOpen = false" />
        </div>
      </aside>
    </Transition>

    <!-- 常驻悬浮 dock：横向工具 + 图层开关 -->
    <aside
      data-test-id="tool-dock"
      class="glass flex shrink-0 items-center gap-1 rounded-full border border-border/40 px-2 py-1.5 shadow-xl shadow-black/25"
    >
      <Toolbar orientation="horizontal" />
      <div class="mx-0.5 h-5 w-px bg-border/60" />
      <button
        data-test-id="tool-dock-layers"
        class="flex size-8 items-center justify-center rounded-full transition"
        :class="panelOpen ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
        title="Layers"
        @click="toggleLayers"
      >
        <icon-lucide-layers class="size-4" />
      </button>
    </aside>
  </div>
</template>
