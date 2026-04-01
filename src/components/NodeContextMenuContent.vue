<script setup lang="ts">
import { computed } from 'vue'
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from 'reka-ui'
import { useEditorStore } from '@/stores/editor'
import { useAIChat } from '@/composables/use-chat'
import { useAISelect } from '@/composables/use-ai-select'
import { menuContent, menuItem, menuSeparator } from '@/components/ui/menu'
import { toast } from '@/composables/use-toast'

const store = useEditorStore()
const { activeTab } = useAIChat()
const { addCurrentSelection } = useAISelect()

const hasSelection = computed(() => {
  void store.state.sceneVersion
  return store.state.selectedIds.size > 0
})

function selectedIds(): string[] {
  return [...store.state.selectedIds]
}

function sendToAIChat() {
  addCurrentSelection()
  activeTab.value = 'create'
}

async function exportAsPNG() {
  const ids = selectedIds()
  const data = await store.renderExportImage(ids, 2, 'PNG')
  if (!data) return
  const blob = new Blob([data], { type: 'image/png' })
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  toast.show('Copied as PNG')
}

const itemClass = menuItem()
const menuClass = menuContent({
  class: 'min-w-56 shadow-[0_8px_30px_rgb(0_0_0/0.4)] animate-in fade-in zoom-in-95'
})
const separatorClass = menuSeparator({ class: 'my-1' })
</script>

<template>
  <ContextMenuContent :class="menuClass" :side-offset="2" align="start">
    <ContextMenuItem :class="itemClass" :disabled="!hasSelection" @select="document.execCommand('copy')">
      <span>Copy</span>
      <span class="text-[12px] text-muted">&#8984;C</span>
    </ContextMenuItem>
    <ContextMenuItem :class="itemClass" @select="document.execCommand('paste')">
      <span>Paste here</span>
      <span class="text-[12px] text-muted">&#8984;V</span>
    </ContextMenuItem>
    <ContextMenuItem :class="itemClass" :disabled="!hasSelection" @select="store.deleteSelected()">
      <span>Delete</span>
      <span class="text-[12px] text-muted">&#9003;</span>
    </ContextMenuItem>

    <ContextMenuSeparator :class="separatorClass" />

    <ContextMenuItem :class="itemClass" :disabled="!hasSelection" @select="sendToAIChat">
      <span>Send to AI Chat</span>
    </ContextMenuItem>
    <ContextMenuItem :class="itemClass" :disabled="!hasSelection" @select="exportAsPNG">
      <span>Export selection (PNG)</span>
      <span class="text-[12px] text-muted">&#8679;&#8984;C</span>
    </ContextMenuItem>
  </ContextMenuContent>
</template>
