<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  ComboboxRoot,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxEmpty,
  useFilter
} from 'reka-ui'

import { colorToCSS } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'

import type { Variable, VariableType } from '@open-pencil/core'

const { variableType, boundVariableId } = defineProps<{
  /** Variable type to filter: COLOR, FLOAT, STRING, BOOLEAN */
  variableType: VariableType
  /** Currently bound variable ID, if any */
  boundVariableId?: string
}>()

const emit = defineEmits<{
  bind: [variableId: string]
  unbind: []
}>()

const store = useEditorStore()
const search = ref('')
const { contains } = useFilter({ sensitivity: 'base' })

const variables = computed(() => store.graph.getVariablesByType(variableType))

const filteredVariables = computed(() => {
  if (!search.value) return variables.value
  return variables.value.filter(v => contains(v.name, search.value))
})

const boundVariable = computed(() => {
  if (!boundVariableId) return undefined
  return store.graph.variables.get(boundVariableId)
})

function resolvedSwatchStyle(v: Variable): string {
  if (v.type !== 'COLOR') return ''
  const color = store.graph.resolveColorVariable(v.id)
  if (!color) return 'background: #000'
  return `background: ${colorToCSS(color)}`
}

function onSelect(v: Variable) {
  emit('bind', v.id)
}
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <button
        class="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded border-none transition-colors"
        :class="boundVariable
          ? 'bg-accent/20 text-accent'
          : 'bg-transparent text-muted hover:bg-hover hover:text-surface'"
        :title="boundVariable ? `Bound: ${boundVariable.name}` : 'Bind variable'"
      >
        <icon-lucide-link class="size-3" />
      </button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        side="left"
        :side-offset="8"
        class="z-50 w-52 rounded-lg border border-border bg-panel p-2 shadow-lg"
      >
        <!-- Bound state -->
        <div v-if="boundVariable" class="mb-2 flex items-center gap-2 rounded bg-accent/10 px-2 py-1.5">
          <div
            v-if="variableType === 'COLOR'"
            class="size-3 shrink-0 rounded-sm border border-border"
            :style="resolvedSwatchStyle(boundVariable)"
          />
          <icon-lucide-hash v-else class="size-3 shrink-0 text-accent" />
          <span class="min-w-0 flex-1 truncate text-[11px] text-accent">{{ boundVariable.name }}</span>
          <button
            class="cursor-pointer border-none bg-transparent p-0 text-muted hover:text-surface"
            title="Unbind"
            @click="emit('unbind')"
          >
            <icon-lucide-x class="size-3" />
          </button>
        </div>

        <!-- Search + list -->
        <ComboboxRoot @update:model-value="onSelect($event as Variable)">
          <ComboboxInput
            v-model="search"
            placeholder="Search variables…"
            class="mb-1 w-full rounded border border-border bg-input px-2 py-1 text-[11px] text-surface outline-none placeholder:text-muted"
          />
          <ComboboxContent class="max-h-48 overflow-y-auto p-1">
            <ComboboxEmpty class="px-2 py-3 text-center text-[11px] text-muted">
              No variables found
            </ComboboxEmpty>
            <ComboboxItem
              v-for="v in filteredVariables"
              :key="v.id"
              :value="v"
              class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[11px] text-surface data-[highlighted]:bg-hover"
            >
              <div
                v-if="variableType === 'COLOR'"
                class="size-3 shrink-0 rounded-sm border border-border"
                :style="resolvedSwatchStyle(v)"
              />
              <icon-lucide-hash v-else class="size-3 shrink-0 text-muted" />
              <span class="min-w-0 flex-1 truncate">{{ v.name }}</span>
            </ComboboxItem>
          </ComboboxContent>
        </ComboboxRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
