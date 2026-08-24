<script setup lang="ts">
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { TOOLS, TOOL_SHORTCUTS, useEditorStore } from '@/stores/editor'
import type { Tool, ToolDef } from '@/stores/editor'
import { toolIcons } from '@/utils/tools'

const { orientation = 'horizontal' } = defineProps<{ orientation?: 'horizontal' | 'vertical' }>()

const store = useEditorStore()

const toolbarRef = ref<HTMLElement | null>(null)
const openFlyout = ref<string | null>(null)
let longPressTimer: ReturnType<typeof setTimeout> | null = null

const shortcutForTool = computed(() => {
  const map: Partial<Record<Tool, string>> = {}
  for (const [key, tool] of Object.entries(TOOL_SHORTCUTS)) {
    if (tool) map[tool] = key.toUpperCase()
  }
  return map
})

/** The currently visible tool for each flyout group (remembers last selection) */
const flyoutSelection = ref<Record<string, Tool>>({})

function visibleTool(def: ToolDef): ToolDef {
  if (!def.flyout) return def
  const sel = flyoutSelection.value[def.key]
  if (sel && sel !== def.key) {
    const sc = shortcutForTool.value[sel] || ''
    const label = sel.charAt(0) + sel.slice(1).toLowerCase()
    return { key: sel, label, shortcut: sc, flyout: def.flyout }
  }
  return def
}

function handleClick(def: ToolDef) {
  const vis = visibleTool(def)
  store.setTool(vis.key)
  openFlyout.value = null
}

function handlePointerDown(def: ToolDef) {
  if (!def.flyout) return
  longPressTimer = setTimeout(() => {
    openFlyout.value = def.key
  }, 400)
}

function handlePointerUp() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

onClickOutside(toolbarRef, () => {
  openFlyout.value = null
})</script>

<template>
  <!-- R15: 工具组住进底部居中悬浮 dock（Framer/Lovart 式，横向）。
       定位由父级负责；flyout 向上弹出。orientation=vertical 时恢复纵向（向左弹）。 -->
  <div ref="toolbarRef" class="flex items-center" :class="orientation === 'vertical' ? 'flex-col' : 'flex-row'">
    <div
      data-test-id="toolbar"
      class="flex gap-1"
      :class="orientation === 'vertical' ? 'flex-col' : 'flex-row'"
    >
      <div
        v-for="tool in TOOLS"
        :key="tool.key"
        class="relative"
        @pointerdown="handlePointerDown(tool)"
        @pointerup="handlePointerUp"
        @pointerleave="handlePointerUp"
        @contextmenu.prevent="tool.flyout ? (openFlyout = tool.key) : undefined"
      >
        <button
          :data-test-id="`toolbar-tool-${tool.key.toLowerCase()}`"
          class="flex size-8 cursor-pointer items-center justify-center rounded-full border-none transition-all duration-150 hover:scale-105"
          :class="
            store.state.activeTool === visibleTool(tool).key
              ? 'gradient-cta text-on-accent shadow-md shadow-accent/30'
              : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
          "
          :title="`${visibleTool(tool).label} (${visibleTool(tool).shortcut})`"
          @click="handleClick(tool)"
        >
          <component :is="toolIcons[visibleTool(tool).key]" class="size-4" />
          <span
            v-if="tool.flyout"
            class="absolute bottom-0.5 right-0.5 text-[7px] leading-none opacity-50"
          >▾</span>
        </button>

        <!-- Flyout popover (horizontal dock: opens upward; vertical: to the right) -->
        <Transition
          enter-active-class="transition-all duration-100"
          :enter-from-class="orientation === 'vertical' ? 'opacity-0 -translate-x-1' : 'opacity-0 translate-y-1'"
          leave-active-class="transition-all duration-75"
          :leave-to-class="orientation === 'vertical' ? 'opacity-0 -translate-x-1' : 'opacity-0 translate-y-1'"
        >
          <div
            v-if="openFlyout === tool.key && tool.flyout"
            class="glass absolute z-20 flex flex-col gap-0.5 rounded-xl border border-border/40 px-1.5 py-1 shadow-xl shadow-black/25"
            :class="orientation === 'vertical' ? 'left-11 top-0' : 'bottom-10 left-1/2 -translate-x-1/2'"
            @mouseleave="openFlyout = null"
          >
            <button
              v-for="ft in tool.flyout"
              :key="ft"
              class="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] transition hover:bg-hover"
              :class="store.state.activeTool === ft ? 'text-accent' : 'text-muted hover:text-surface'"
              @click="flyoutSelection[tool.key] = ft; store.setTool(ft); openFlyout = null"
            >
              <component :is="toolIcons[ft]" class="size-3.5" />
              <span>{{ ft.charAt(0) + ft.slice(1).toLowerCase() }}</span>
              <kbd v-if="shortcutForTool[ft]" class="ml-1 text-[9px] opacity-40">{{ shortcutForTool[ft] }}</kbd>
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
