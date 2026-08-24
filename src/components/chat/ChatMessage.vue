<script setup lang="ts">
import { isTextUIPart, isToolUIPart, getToolName } from 'ai'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { Markdown } from 'vue-stream-markdown'
import 'vue-stream-markdown/index.css'

import type { UIMessage, UIMessagePart } from 'ai'

const { message } = defineProps<{ message: UIMessage }>()

type ToolPart = Extract<UIMessagePart, { toolCallId: string }>

function toolDisplayName(part: ToolPart): string {
  return getToolName(part)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function hasErrorOutput(part: ToolPart): boolean {
  return (
    part.state === 'output-available' &&
    typeof part.output === 'object' &&
    part.output !== null &&
    'error' in part.output
  )
}

/**
 * submit_* 桥接工具在校验未过时会返回 needsMoreInfo —— 这是引导流程的正常一环
 * （AI 还需要向用户补问信息），不是系统故障，UI 上按"待补充"而非"出错"渲染。
 */
function isNeedsMoreInfo(part: ToolPart): boolean {
  return (
    part.state === 'output-available' &&
    typeof part.output === 'object' &&
    part.output !== null &&
    (part.output as { needsMoreInfo?: boolean }).needsMoreInfo === true
  )
}

function toolState(part: ToolPart): 'pending' | 'done' | 'error' | 'needs-info' {
  if (isNeedsMoreInfo(part)) return 'needs-info'
  if (part.state === 'output-error' || hasErrorOutput(part)) return 'error'
  if (part.state === 'output-available') return 'done'
  return 'pending'
}

function partKey(part: UIMessagePart, index: number): string {
  if ('toolCallId' in part) return part.toolCallId
  return `part-${index}`
}
</script>

<template>
  <div
    :data-test-id="`chat-message-${message.role}`"
    class="animate-in fade-in slide-in-from-bottom-1 duration-300"
    :class="message.role === 'user' ? 'flex justify-end' : ''"
  >
    <div class="min-w-0 select-text space-y-1.5" :class="message.role === 'user' ? 'max-w-[85%]' : ''">
      <template v-if="message.role === 'assistant'">
        <template v-for="(part, i) in message.parts" :key="partKey(part, i)">
          <!-- Tool call -->
          <div v-if="isToolUIPart(part)" class="rounded-xl border border-border/40 bg-inset p-2">
            <CollapsibleRoot>
              <CollapsibleTrigger
                class="flex w-full items-center gap-2 rounded px-1 py-0.5 hover:bg-hover"
              >
                <div
                  class="flex size-4 items-center justify-center rounded-full"
                  :class="{
                    'bg-accent/20 text-accent': toolState(part) === 'pending',
                    'bg-green-500/20 text-green-400': toolState(part) === 'done',
                    'bg-amber-500/20 text-amber-400': toolState(part) === 'needs-info',
                    'bg-red-500/20 text-red-400': toolState(part) === 'error'
                  }"
                >
                  <icon-lucide-loader-circle
                    v-if="toolState(part) === 'pending'"
                    class="size-3 animate-spin"
                  />
                  <icon-lucide-check v-else-if="toolState(part) === 'done'" class="size-3" />
                  <icon-lucide-circle-help v-else-if="toolState(part) === 'needs-info'" class="size-3" />
                  <icon-lucide-triangle-alert v-else class="size-3" />
                </div>
                <span class="text-[11px] text-surface">
                  {{ toolDisplayName(part) }}
                </span>
                <span class="text-[10px] text-muted">
                  {{
                    toolState(part) === 'pending'
                      ? 'Running…'
                      : toolState(part) === 'done'
                        ? 'Done'
                        : toolState(part) === 'needs-info'
                          ? 'Needs more info'
                          : 'Error'
                  }}
                </span>
                <icon-lucide-chevron-down
                  v-if="toolState(part) !== 'pending'"
                  class="ml-auto size-3 text-muted transition-transform [[data-state=open]>&]:rotate-180"
                />
              </CollapsibleTrigger>
              <CollapsibleContent
                v-if="toolState(part) !== 'pending'"
                class="data-[state=closed]:collapsible-up data-[state=open]:collapsible-down overflow-hidden text-[10px]"
              >
                <!-- needsMoreInfo 的 output 是写给模型的恢复指令，用户看到的是友好提示 -->
                <p v-if="toolState(part) === 'needs-info'" class="mt-1 rounded bg-input p-2 text-muted">
                  还差一点点信息就能进入下一阶段 —— 继续在下方对话里补充即可，无需重试。
                </p>
                <pre v-else class="mt-1 overflow-x-auto rounded bg-input p-2 text-muted">{{
                  part.state === 'output-error' && part.errorText
                    ? part.errorText
                    : hasErrorOutput(part)
                      ? (part.output as { error: string }).error
                      : JSON.stringify(part.output, null, 2)
                }}</pre>
              </CollapsibleContent>
            </CollapsibleRoot>
          </div>

          <!-- Text — assistant messages sit directly on the panel (Lovart-style plain) -->
          <div
            v-else-if="isTextUIPart(part) && part.text"
            data-test-id="chat-text-bubble"
            class="px-1 py-0.5 text-xs leading-relaxed text-surface"
          >
            <Markdown :content="part.text" :mermaid="false" class="chat-markdown" />
          </div>
        </template>
      </template>

      <!-- User message — accent-tinted glass, not a saturated brand block -->
      <div
        v-else-if="message.role === 'user'"
        data-test-id="chat-text-bubble"
        class="rounded-2xl rounded-br-md border border-accent/25 bg-accent/10 px-3.5 py-2 text-xs leading-relaxed whitespace-pre-wrap text-surface"
      >
        {{
          message.parts
            .filter(isTextUIPart)
            .map((p) => p.text)
            .join('')
        }}
      </div>
    </div>
  </div>
</template>
