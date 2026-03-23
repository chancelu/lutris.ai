import { ref, readonly, computed, watch } from 'vue'

import { useProjects } from './use-projects'

// ── Product Document Store ──
// Per-project PRD with bidirectional sync between design canvas and product documentation.
// Anti-recursion: syncSource flag prevents infinite loops.

export interface DocVersion {
  id: number
  content: string
  timestamp: number
  source: 'user' | 'design' | 'import' | 'ai'
  label?: string
}

export interface SyncConflict {
  docContent: string
  designContent: string
  timestamp: number
}

type SyncSource = 'user' | 'design' | 'doc' | null

const MAX_VERSIONS = 50

/** Detect if content is binary (high ratio of non-printable chars) */
function isBinaryContent(text: string): boolean {
  const sample = text.slice(0, 1024)
  if (!sample) return false
  const nonPrintable = sample.split('').filter(c => {
    const code = c.charCodeAt(0)
    return code < 32 && code !== 9 && code !== 10 && code !== 13
  }).length
  return nonPrintable / sample.length > 0.1
}

// ── State (reactive, driven by active project) ──
const currentContent = ref('')
const versions = ref<DocVersion[]>([])
const isEditing = ref(false)
const showMarkdown = ref(true)
const syncSource = ref<SyncSource>(null)
const pendingConflict = ref<SyncConflict | null>(null)
const pendingSyncConfirm = ref<{ content: string; source: SyncSource } | null>(null)
const isImporting = ref(false)
const isParsing = ref(false)
const versionCounter = ref(0)

// ── Sync with useProjects ──

function syncToProject(): void {
  const { activePRD, saveActiveProjectData } = useProjects()
  activePRD.value = {
    content: currentContent.value,
    versions: versions.value,
    versionCounter: versionCounter.value,
  }
  // Debounced persist
  void saveActiveProjectData()
}

function syncFromProject(): void {
  const { activePRD } = useProjects()
  const prd = activePRD.value
  const content = prd.content || ''
  if (content && isBinaryContent(content)) {
    currentContent.value = ''
    versions.value = []
    versionCounter.value = 0
    return
  }
  currentContent.value = content
  versions.value = prd.versions
  versionCounter.value = prd.versionCounter
}

// Watch active project changes to reload PRD
let _watchInitialized = false
function initProjectWatch(): void {
  if (_watchInitialized) return
  _watchInitialized = true
  const { activeProjectId } = useProjects()
  watch(() => activeProjectId.value, () => {
    syncFromProject()
  })
  // Initial load
  syncFromProject()
}

// ── Version Management ──
function createVersion(content: string, source: DocVersion['source'], label?: string): DocVersion {
  const version: DocVersion = {
    id: ++versionCounter.value,
    content,
    timestamp: Date.now(),
    source,
    label,
  }
  versions.value = [...versions.value, version]
  if (versions.value.length > MAX_VERSIONS) {
    versions.value = versions.value.slice(-MAX_VERSIONS)
  }
  syncToProject()
  return version
}

function restoreVersion(versionId: number) {
  const version = versions.value.find((v) => v.id === versionId)
  if (!version) return false

  syncSource.value = 'user'
  currentContent.value = version.content
  createVersion(version.content, 'user', `Restored from v${versionId}`)
  syncSource.value = null
  return true
}

// ── Document Update (from user editing) ──
function updateContent(content: string) {
  syncSource.value = 'user'
  currentContent.value = content
  createVersion(content, 'user')
  syncSource.value = null
}

// ── Import file (Word/TXT/MD) ──
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
      const sample = text.slice(0, 1024)
      const nonPrintable = sample.split('').filter(c => {
        const code = c.charCodeAt(0)
        return code < 32 && code !== 9 && code !== 10 && code !== 13
      }).length
      if (nonPrintable / sample.length > 0.1) {
        throw new Error('File appears to be binary. Only text-based documents are supported.')
      }
    }

    syncSource.value = 'user'
    currentContent.value = text
    createVersion(text, 'import', `Imported: ${file.name}`)
    syncSource.value = null
    return text
  } finally {
    isImporting.value = false
  }
}

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

// ── Design → Doc sync ──
function updateFromDesign(designDescription: string) {
  if (syncSource.value === 'doc') return

  if (!currentContent.value.trim()) {
    syncSource.value = 'design'
    currentContent.value = designDescription
    createVersion(designDescription, 'design', 'Auto-generated from design')
    syncSource.value = null
    return
  }

  pendingSyncConfirm.value = {
    content: designDescription,
    source: 'design',
  }
}

// ── Doc → Design sync ──
function requestDesignSync(): string | undefined {
  if (syncSource.value === 'design') return undefined
  return currentContent.value
}

// ── Conflict Resolution ──
function acceptDesignVersion() {
  if (!pendingConflict.value) return
  syncSource.value = 'design'
  currentContent.value = pendingConflict.value.designContent
  createVersion(pendingConflict.value.designContent, 'design', 'Accepted design version')
  pendingConflict.value = null
  syncSource.value = null
}

function keepDocVersion() {
  pendingConflict.value = null
}

function acceptPendingSync() {
  if (!pendingSyncConfirm.value) return
  const { content, source } = pendingSyncConfirm.value

  syncSource.value = source
  currentContent.value = content
  createVersion(content, source === 'design' ? 'design' : 'user', `Synced from ${source}`)
  pendingSyncConfirm.value = null
  syncSource.value = null
}

function rejectPendingSync() {
  pendingSyncConfirm.value = null
}

// ── Computed ──
const hasContent = computed(() => currentContent.value.trim().length > 0)
const versionCount = computed(() => versions.value.length)
const latestVersion = computed(() =>
  versions.value.length > 0 ? versions.value[versions.value.length - 1] : null
)

// ── PM Skill Integration ──

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

const PM_DESIGN_SYNC_PROMPT = `You are a senior product manager analyzing a design to extract product requirements.

Given a design description (layout, components, interactions):
1. Reverse-engineer the product requirements:
   - What user problem does this design solve?
   - What are the key user flows?
   - What features are implemented?
   - What design decisions were made and why?

2. Structure as a living product document:
   - Overview & Problem Statement
   - User Flows (step by step)
   - Feature Inventory (what exists on canvas)
   - Design Decisions & Rationale
   - Open Questions

3. Mark any inferred requirements with [inferred from design].
4. Keep it concise — this syncs bidirectionally with the design canvas.

Output: Clean Markdown product spec.`

const PM_DOC_TO_DESIGN_PROMPT = `You are a senior product manager translating requirements into design specifications.

Given a product document:
1. Extract actionable design requirements:
   - Page/screen list with hierarchy
   - Component inventory (buttons, forms, cards, etc.)
   - Layout specifications (grid, spacing, alignment)
   - Content requirements (text, images, data)
   - Interaction patterns (clicks, hovers, transitions)

2. For each screen/page, provide:
   - Layout description (natural language, suitable for AI design generation)
   - Component list with properties
   - Content placeholders

3. Prioritize by P0 → P1 → P2.
4. Flag any requirements that are ambiguous or need PM clarification.

Output: Structured design brief that can be fed to an AI design generator.`

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

export function useProductDoc() {
  // Initialize project watch on first use
  initProjectWatch()

  return {
    // State
    currentContent,
    versions: readonly(versions),
    isEditing,
    showMarkdown,
    isImporting: readonly(isImporting),
    isParsing: readonly(isParsing),
    pendingConflict: readonly(pendingConflict),
    pendingSyncConfirm: readonly(pendingSyncConfirm),
    hasContent,
    versionCount,
    latestVersion,

    // Actions
    updateContent,
    importFile,
    createVersion,
    restoreVersion,
    updateFromDesign,
    requestDesignSync,
    acceptDesignVersion,
    keepDocVersion,
    acceptPendingSync,
    rejectPendingSync,
    saveToStorage: syncToProject,

    // PM Skill prompts
    getParsePrompt,
    getStructuredParsePrompt,
    getDesignSyncPrompt,
    getDocToDesignPrompt,
  }
}
