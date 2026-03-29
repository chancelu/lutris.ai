<script setup lang="ts">
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarPortal,
  MenubarRoot,
  MenubarSeparator,
  MenubarTrigger,
} from 'reka-ui'

import { menuContent, menuItem, menuSeparator } from '@/components/ui/menu'
import { IS_TAURI } from '@/constants'
import { openFileDialog } from '@/composables/use-menu'
import { useEditorStore } from '@/stores/editor'
import { useProjects } from '@/composables/use-projects'

const store = useEditorStore()
const { createProject } = useProjects()

const isMac = navigator.platform.includes('Mac')
const mod = isMac ? '⌘' : 'Ctrl+'

function handleNewProject() {
  const name = window.prompt('Project name')
  if (name?.trim()) createProject(name.trim())
}

function handleExport() {
  if (store.state.selectedIds.size > 0) store.exportSelection(1, 'PNG')
}

const fileItems = [
  { label: 'New Project', action: handleNewProject },
  { label: 'Open .fig File', shortcut: `${mod}O`, action: () => openFileDialog() },
  { separator: true },
  { label: 'Export Selection', shortcut: `${mod}⇧E`, action: handleExport },
  { separator: true },
  { label: 'Theme Toggle', action: () => document.documentElement.classList.toggle('dark') },
  { label: 'Keyboard Shortcuts', shortcut: '?', action: () => window.open('https://github.com/nicepkg/open-pencil#shortcuts', '_blank') },
]
</script>

<template>
  <div class="shrink-0 border-b border-border">
    <div class="flex items-center gap-2 px-2 py-1.5">
      <img data-test-id="app-logo" src="/lutris-mascot.png" class="size-4" alt="Lutris.ai" />
      <span
        data-test-id="app-document-name"
        class="min-w-0 flex-1 truncate text-xs text-surface"
      >{{ store.state.documentName }}</span>
      <button
        data-test-id="app-toggle-ui"
        class="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
        title="Toggle UI (⌘\)"
        @click="store.state.showUI = !store.state.showUI"
      >
        <icon-lucide-sidebar class="size-3.5" />
      </button>
    </div>
    <div v-if="!IS_TAURI" class="flex items-center px-1 pb-1">
      <MenubarRoot class="flex items-center gap-0.5">
        <MenubarMenu>
          <MenubarTrigger
            data-test-id="menubar-file"
            class="flex cursor-pointer items-center rounded px-2 py-1 text-xs text-muted transition-colors select-none hover:bg-hover hover:text-surface data-[state=open]:bg-hover data-[state=open]:text-surface"
          >
            File
          </MenubarTrigger>
          <MenubarPortal>
            <MenubarContent :side-offset="4" align="start" :class="menuContent({ class: 'min-w-48' })">
              <template v-for="(item, i) in fileItems" :key="i">
                <MenubarSeparator v-if="'separator' in item && item.separator" :class="menuSeparator()" />
                <MenubarItem v-else :class="menuItem()" @select="item.action?.()">
                  <span class="flex-1">{{ item.label }}</span>
                  <span v-if="'shortcut' in item && item.shortcut" class="text-[12px] text-muted">{{ item.shortcut }}</span>
                </MenubarItem>
              </template>
            </MenubarContent>
          </MenubarPortal>
        </MenubarMenu>
      </MenubarRoot>
    </div>
  </div>
</template>
