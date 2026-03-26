import type { RequirementsBoard, Requirement } from '@/types/requirements'
import { createEmptyBoard } from '@/types/requirements'

export type SpecSource = 'user' | 'design' | 'import' | 'ai'

export interface SpecVersion {
  id: number
  timestamp: number
  source: SpecSource
  label?: string
  summarySnapshot: string
  requirementsSnapshot: RequirementsBoard
}

export interface SpecSyncMeta {
  lastImportedFromDocAt: number | null
  lastSyncedFromDesignAt: number | null
  lastGeneratedFromAIAt: number | null
  pendingDiff: string | null
}

export interface SpecDocument {
  projectId?: string
  summary: string
  requirementsBoard: RequirementsBoard
  versions: SpecVersion[]
  versionCounter: number
  syncMeta: SpecSyncMeta
}

export function createEmptySpecDocument(): SpecDocument {
  return {
    summary: '',
    requirementsBoard: createEmptyBoard(),
    versions: [],
    versionCounter: 0,
    syncMeta: {
      lastImportedFromDocAt: null,
      lastSyncedFromDesignAt: null,
      lastGeneratedFromAIAt: null,
      pendingDiff: null,
    },
  }
}

export function summarizeRequirements(requirements: Requirement[]): string {
  if (requirements.length === 0) return ''
  return requirements.map((req) => `- [${req.priority}] ${req.title}: ${req.description || req.userStory || 'No description yet'}`).join('\n')
}
