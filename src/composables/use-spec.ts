import { computed, readonly, ref, watch } from 'vue'

import { useProjects } from './use-projects'
import { createEmptySpecDocument, summarizeRequirements, type SpecDocument, type SpecSource, type SpecVersion } from '@/types/spec'
import { createRequirement } from '@/types/requirements'
import type { Requirement, RequirementsBoard } from '@/types/requirements'

const specDocument = ref<SpecDocument>(createEmptySpecDocument())
let initialized = false
let syncing = false

function syncFromProject() {
  const { activePRD } = useProjects()
  const prd = activePRD.value
  const board = (prd as { requirementsBoard?: RequirementsBoard }).requirementsBoard
  const syncMeta = (prd as { syncMeta?: SpecDocument['syncMeta'] }).syncMeta
  specDocument.value = {
    summary: prd.content || '',
    requirementsBoard: board || createEmptySpecDocument().requirementsBoard,
    versions: prd.versions.map((version) => ({
      id: version.id,
      timestamp: version.timestamp,
      source: version.source,
      label: version.label,
      summarySnapshot: version.content,
      requirementsSnapshot: board || createEmptySpecDocument().requirementsBoard,
    })),
    versionCounter: prd.versionCounter || 0,
    syncMeta: syncMeta || createEmptySpecDocument().syncMeta,
  }
}

function syncToProject() {
  const { activePRD, saveActiveProjectData } = useProjects()
  syncing = true
  activePRD.value = {
    ...activePRD.value,
    content: specDocument.value.summary,
    versions: specDocument.value.versions.map((version) => ({
      id: version.id,
      timestamp: version.timestamp,
      source: version.source,
      label: version.label,
      content: version.summarySnapshot,
    })),
    versionCounter: specDocument.value.versionCounter,
    requirementsBoard: structuredClone(specDocument.value.requirementsBoard),
    syncMeta: structuredClone(specDocument.value.syncMeta),
  } as typeof activePRD.value
  syncing = false
  void saveActiveProjectData()
}

function createVersion(source: SpecSource, label?: string) {
  const next: SpecVersion = {
    id: specDocument.value.versionCounter + 1,
    timestamp: Date.now(),
    source,
    label,
    summarySnapshot: specDocument.value.summary,
    requirementsSnapshot: structuredClone(specDocument.value.requirementsBoard),
  }
  specDocument.value = {
    ...specDocument.value,
    versionCounter: next.id,
    versions: [...specDocument.value.versions, next].slice(-50),
  }
}

function updateSummary(text: string, source: SpecSource = 'user', label?: string) {
  specDocument.value = {
    ...specDocument.value,
    summary: text,
  }
  createVersion(source, label)
  syncToProject()
}

function appendSummary(text: string, source: SpecSource = 'ai', label?: string) {
  const separator = specDocument.value.summary ? '\n\n---\n\n' : ''
  updateSummary(specDocument.value.summary + separator + text, source, label)
}

function upsertRequirements(items: Requirement[], source: SpecSource = 'ai', label?: string) {
  const existing = new Map(specDocument.value.requirementsBoard.requirements.map((req) => [req.id, req]))
  for (const item of items) existing.set(item.id, item)
  specDocument.value = {
    ...specDocument.value,
    requirementsBoard: {
      ...specDocument.value.requirementsBoard,
      requirements: [...existing.values()],
    },
  }
  createVersion(source, label)
  syncToProject()
}

function replaceRequirementsBoard(board: RequirementsBoard, source: SpecSource = 'ai', label?: string) {
  specDocument.value = {
    ...specDocument.value,
    requirementsBoard: structuredClone(board),
  }
  createVersion(source, label)
  syncToProject()
}

function parseRequirementsFromText(text: string): Requirement[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /^([-*]|\d+[.)])\s+/.test(line) || /^P[0-2]\b/i.test(line))

  return lines.map((line) => {
    const cleaned = line
      .replace(/^([-*]|\d+[.)])\s+/, '')
      .trim()

    const priorityMatch = cleaned.match(/^(P[0-2])[:\-\s]+/i)
    const priority = (priorityMatch?.[1]?.toUpperCase() as 'P0' | 'P1' | 'P2' | undefined) ?? 'P1'
    const remainder = priorityMatch ? cleaned.slice(priorityMatch[0].length).trim() : cleaned
    const [titlePart, ...descParts] = remainder.split(/[:：]\s+/)
    const title = titlePart.trim().slice(0, 140) || 'Untitled requirement'
    const description = descParts.join(': ').trim() || remainder

    return createRequirement(title, {
      description,
      priority,
      status: 'draft',
      userStory: '',
      acceptanceCriteria: [],
      linkedNodeIds: [],
      linkedChatMessageIds: [],
    })
  })
}

function saveRequirementsFromText(text: string, source: SpecSource = 'ai', label = 'Saved requirements from AI') {
  const parsed = parseRequirementsFromText(text)
  if (parsed.length === 0) return 0

  const existingByTitle = new Map(
    specDocument.value.requirementsBoard.requirements.map((req) => [req.title.toLowerCase(), req]),
  )

  const merged = parsed.map((req) => {
    const existing = existingByTitle.get(req.title.toLowerCase())
    if (!existing) return req
    return {
      ...req,
      id: existing.id,
      linkedNodeIds: existing.linkedNodeIds,
      linkedChatMessageIds: existing.linkedChatMessageIds,
      status: existing.status,
    }
  })

  upsertRequirements(merged, source, label)
  return merged.length
}

function createSpecDraftFromAI(text: string) {
  updateSummary(`## Spec Draft\n\n${text}`, 'ai', 'Created spec draft from AI')
}

function restoreVersion(versionId: number) {
  const version = specDocument.value.versions.find((item) => item.id === versionId)
  if (!version) return false
  specDocument.value = {
    ...specDocument.value,
    summary: version.summarySnapshot,
    requirementsBoard: structuredClone(version.requirementsSnapshot),
  }
  createVersion('user', `Restored from v${versionId}`)
  syncToProject()
  return true
}

let projectWatchInit = false

function initSpec() {
  if (!initialized) {
    initialized = true
    syncFromProject()
  }

  if (!projectWatchInit) {
    projectWatchInit = true
    const { activeProjectId, activePRD } = useProjects()
    watch([activeProjectId, activePRD], () => {
      if (!syncing) syncFromProject()
    })
  }
}

export function useSpec() {
  initSpec()

  const hasSpec = computed(() => specDocument.value.summary.trim().length > 0 || specDocument.value.requirementsBoard.requirements.length > 0)
  const summary = computed(() => specDocument.value.summary)
  const requirementsBoard = computed(() => specDocument.value.requirementsBoard)
  const requirements = computed(() => specDocument.value.requirementsBoard.requirements)
  const versions = computed(() => specDocument.value.versions)
  const summaryFromRequirements = computed(() => summarizeRequirements(specDocument.value.requirementsBoard.requirements))

  return {
    specDocument: readonly(specDocument),
    hasSpec,
    summary,
    requirementsBoard,
    requirements,
    versions,
    summaryFromRequirements,
    syncFromProject,
    syncToProject,
    updateSummary,
    appendSummary,
    upsertRequirements,
    replaceRequirementsBoard,
    saveRequirementsFromText,
    createSpecDraftFromAI,
    restoreVersion,
  }
}
