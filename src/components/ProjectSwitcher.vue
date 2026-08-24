<script setup lang="ts">
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal } from 'reka-ui'

const { projectName, projects, activeProjectId } = defineProps<{
  projectName: string
  projects: Array<{ id: string; name: string }>
  activeProjectId: string | null
}>()

const emit = defineEmits<{
  switch: [projectId: string]
  create: []
  delete: [projectId: string]
}>()
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <button
        class="flex size-6 items-center justify-center rounded-md text-muted transition hover:bg-hover hover:text-surface"
        title="Switch project"
      >
        <icon-lucide-chevron-down class="size-3.5" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent side="bottom" :side-offset="8" align="start" class="z-50 min-w-48 rounded-lg border border-border/50 bg-panel p-1 shadow-xl">
        <DropdownMenuItem
          v-for="proj in projects" :key="proj.id"
          class="group/item flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] outline-none transition"
          :class="proj.id === activeProjectId ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-hover hover:text-surface'"
          @select="emit('switch', proj.id)"
        >
          <icon-lucide-file-text class="size-3.5 shrink-0" />
          <span class="flex-1 truncate">{{ proj.name }}</span>
          <span v-if="proj.id === activeProjectId" class="text-[10px] text-accent">●</span>
          <button
            class="ml-1 flex size-5 items-center justify-center rounded text-red-400 opacity-0 transition hover:bg-red-500/15 group-hover/item:opacity-100"
            title="Delete project"
            @click.stop.prevent="emit('delete', proj.id)"
          >
            <icon-lucide-trash-2 class="size-3" />
          </button>
        </DropdownMenuItem>
        <div class="my-1 h-px bg-border/30" />
        <DropdownMenuItem
          class="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-muted outline-none transition hover:bg-hover hover:text-surface"
          @select="emit('create')"
        >
          <icon-lucide-plus class="size-3.5" />
          <span>New Project</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
