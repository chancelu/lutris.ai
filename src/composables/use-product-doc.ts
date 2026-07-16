import { computed, readonly, ref } from 'vue'

import { useSpec } from './use-spec'
import type { DocVersion } from '@/types/project'

export type { DocVersion } from '@/types/project'

type SyncSource = 'user' | 'design' | 'doc' | null

const isEditing = ref(false)
const showMarkdown = ref(true)
const pendingSyncConfirm = ref<{ content: string; source: SyncSource } | null>(null)
const isImporting = ref(false)
const isParsing = ref(false)

const PM_PARSE_PROMPT = `You are a senior product manager with expertise in PRD writing and requirements analysis.

When parsing a product document:
1. Extract and structure requirements using standard PRD format:
   - Problem Statement (specific, no solution smuggling)
   - User Personas (role + context + motivation, not just "users")
   - User Stories (As a [role], I want [action], so that [outcome])
   - Feature Requirements (grouped by priority: P0/P1/P2)
   - Success Metrics (measurable: number + direction + timeframe)
   - Out of Scope (explicit boundaries)
   - Technical Constraints

2. Apply these quality gates:
   - Label assumptions with [assumption]
   - Every outcome must be measurable
   - Name tradeoffs explicitly
   - Flag anti-patterns: Feature Factory, Solution Smuggling, Metrics Theater

3. Output clean Markdown with clear hierarchy.
   - Tables for feature lists and comparisons
   - Bullet lists for requirements
   - Bold for key decisions

Format: Output as structured Markdown that can be directly used as a product spec.`

const PM_STRUCTURED_PARSE_PROMPT = `You are a senior product manager. Parse the given PRD into a structured JSON RequirementsBoard.

Output ONLY valid JSON matching this schema:
{
  "problemStatement": "string",
  "personas": [{ "role": "string", "context": "string", "motivation": "string" }],
  "requirements": [{
    "id": "req_<unique>",
    "title": "string",
    "description": "string",
    "priority": "P0" | "P1" | "P2",
    "status": "draft",
    "userStory": "As a [role], I want [action], so that [outcome]",
    "acceptanceCriteria": [{ "id": "ac_<unique>", "description": "string", "met": false }],
    "linkedNodeIds": [],
    "linkedChatMessageIds": []
  }],
  "outOfScope": ["string"],
  "successMetrics": [{ "metric": "string", "target": "string", "timeframe": "string" }]
}

Rules:
- Every feature becomes a Requirement with priority P0/P1/P2
- Extract user stories in standard format
- Break acceptance criteria into testable statements
- Flag assumptions in descriptions with [assumption]
- Output ONLY the JSON, no markdown fences, no explanation`

async function parseWordFile(file: File): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const arrayBuffer = await file.arrayBuffer()
    const result = await (mammoth as unknown as { convertToMarkdown: typeof mammoth.convertToHtml }).convertToMarkdown({ arrayBuffer })
    return result.value
  } catch {
    return await file.text()
  }
}

export function useProductDoc() {
  const { summary, versions, updateSummary, appendSummary, restoreVersion } = useSpec()

  const currentContent = computed(() => summary.value)
  const versionCount = computed(() => versions.value.length)
  const latestVersion = computed(() => versions.value.length > 0 ? versions.value[versions.value.length - 1] : null)
  const hasContent = computed(() => currentContent.value.trim().length > 0)

  function updateContent(content: string) {
    updateSummary(content, 'user', 'Updated product document')
  }

  function appendContent(content: string, source: DocVersion['source'] = 'ai') {
    appendSummary(content, source, 'Imported from AI Chat')
  }

  async function importFile(file: File): Promise<string> {
    isImporting.value = true
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let text = ''

      const binaryExts = ['fig', 'sketch', 'xd', 'psd', 'ai', 'pdf', 'zip', 'rar', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'wasm', 'exe', 'dll']
      if (ext && binaryExts.includes(ext)) {
        throw new Error(`Cannot import .${ext} files as a document. Use File > Open for design files.`)
      }

      if (ext === 'md' || ext === 'txt') {
        text = await file.text()
      } else if (ext === 'docx' || ext === 'doc') {
        text = await parseWordFile(file)
      } else {
        text = await file.text()
      }

      updateSummary(text, 'import', `Imported: ${file.name}`)
      return text
    } finally {
      isImporting.value = false
    }
  }

  function updateFromDesign(designDescription: string) {
    if (!currentContent.value.trim()) {
      updateSummary(designDescription, 'design', 'Auto-generated from design')
      return
    }

    pendingSyncConfirm.value = {
      content: designDescription,
      source: 'design',
    }
  }

  function requestDesignSync(): string | undefined {
    return currentContent.value || undefined
  }

  function acceptDesignVersion() {
    if (!pendingConflict.value) return
    updateSummary(pendingConflict.value.designContent, 'design', 'Accepted design version')
    pendingConflict.value = null
  }

  function keepDocVersion() {
    pendingConflict.value = null
  }

  function acceptPendingSync() {
    if (!pendingSyncConfirm.value) return
    const { content, source } = pendingSyncConfirm.value
    updateSummary(content, source === 'design' ? 'design' : 'user', `Synced from ${source}`)
    pendingSyncConfirm.value = null
  }

  function rejectPendingSync() {
    pendingSyncConfirm.value = null
  }

  function getParsePrompt(): string {
    return PM_PARSE_PROMPT
  }

  function getStructuredParsePrompt(): string {
    return PM_STRUCTURED_PARSE_PROMPT
  }

  function getDesignSyncPrompt(): string {
    return PM_DESIGN_SYNC_PROMPT
  }

  function getDocToDesignPrompt(): string {
    return PM_DOC_TO_DESIGN_PROMPT
  }

  return {
    currentContent,
    versions: readonly(computed(() => versions.value.map((version) => ({
      id: version.id,
      content: version.snapshot.freeformNotes,
      timestamp: version.timestamp,
      source: version.source,
      label: version.label,
    })))),
    isEditing,
    showMarkdown,
    isImporting: readonly(isImporting),
    isParsing: readonly(isParsing),
    pendingConflict: readonly(pendingConflict),
    pendingSyncConfirm: readonly(pendingSyncConfirm),
    hasContent,
    versionCount,
    latestVersion,
    updateContent,
    appendContent,
    importFile,
    restoreVersion,
    updateFromDesign,
    requestDesignSync,
    acceptDesignVersion,
    keepDocVersion,
    acceptPendingSync,
    rejectPendingSync,
    saveToStorage: () => undefined,
    getParsePrompt,
    getStructuredParsePrompt,
    getDesignSyncPrompt,
    getDocToDesignPrompt,
  }
}
