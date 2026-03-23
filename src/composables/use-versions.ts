import { ref, readonly, computed } from 'vue'

import { useProjects } from './use-projects'

import type { ProjectSnapshot } from '@/types/project'

// ── Version Control ──
// Named versions with diff, visual overlay, and milestone auto-versioning.

export interface VersionDiff {
  added: string[]    // node IDs added
  removed: string[]  // node IDs removed
  modified: string[] // node IDs with property changes
}

export interface NamedVersion {
  snapshot: ProjectSnapshot
  description: string
  milestone: boolean
}

const versions = ref<NamedVersion[]>([])
const selectedVersionId = ref<number | null>(null)
const diffResult = ref<VersionDiff | null>(null)
const showDiffOverlay = ref(false)

// ── Version CRUD ──

function createVersion(
  label: string,
  description: string,
  getSceneData: () => string,
  milestone = false,
): NamedVersion | null {
  const { createSnapshot } = useProjects()
  const snapshot = createSnapshot(label, getSceneData)
  if (!snapshot) return null

  const version: NamedVersion = { snapshot, description, milestone }
  versions.value = [...versions.value, version]
  return version
}

function createMilestoneVersion(
  label: string,
  getSceneData: () => string,
): NamedVersion | null {
  return createVersion(label, `Milestone: ${label}`, getSceneData, true)
}

// ── Diff ──

function computeDiff(versionA: number, versionB: number): VersionDiff | null {
  const a = versions.value.find((v) => v.snapshot.id === versionA)
  const b = versions.value.find((v) => v.snapshot.id === versionB)
  if (!a || !b) return null

  try {
    const nodesA = parseSceneNodes(a.snapshot.sceneData)
    const nodesB = parseSceneNodes(b.snapshot.sceneData)

    const idsA = new Set(Object.keys(nodesA))
    const idsB = new Set(Object.keys(nodesB))

    const added = [...idsB].filter((id) => !idsA.has(id))
    const removed = [...idsA].filter((id) => !idsB.has(id))
    const modified = [...idsA].filter((id) => {
      if (!idsB.has(id)) return false
      return JSON.stringify(nodesA[id]) !== JSON.stringify(nodesB[id])
    })

    const diff: VersionDiff = { added, removed, modified }
    diffResult.value = diff
    return diff
  } catch {
    return null
  }
}

function parseSceneNodes(sceneData: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(sceneData)
    if (typeof parsed === 'object' && parsed !== null) return parsed
    return {}
  } catch {
    return {}
  }
}

function toggleDiffOverlay(): void {
  showDiffOverlay.value = !showDiffOverlay.value
}

function clearDiff(): void {
  diffResult.value = null
  showDiffOverlay.value = false
  selectedVersionId.value = null
}

// ── Computed ──

const versionCount = computed(() => versions.value.length)
const milestones = computed(() => versions.value.filter((v) => v.milestone))
const latestVersion = computed(() =>
  versions.value.length > 0 ? versions.value[versions.value.length - 1] : null
)

export function useVersions() {
  return {
    versions: readonly(versions),
    selectedVersionId,
    diffResult: readonly(diffResult),
    showDiffOverlay,
    versionCount,
    milestones,
    latestVersion,

    createVersion,
    createMilestoneVersion,
    computeDiff,
    toggleDiffOverlay,
    clearDiff,
  }
}
