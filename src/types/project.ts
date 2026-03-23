// ── Unified Project Data Model ──
// All project data flows through these types.
// Every piece of state (PRD, brand, chat, design) is per-project.

import type { DocVersion } from '@/composables/use-product-doc'
import type { UIMessage } from 'ai'

// ── Project Identity ──

export interface ProjectMeta {
  readonly id: string
  name: string
  /** 'enterprise' = imported PRD/fig/code, 'blank' = empty or AI-driven */
  startPath: 'enterprise' | 'blank'
  createdAt: number
  updatedAt: number
}

// ── Brand Configuration ──

export interface ProjectBrand {
  appName: string
  tagline: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  borderRadius: string
}

export const DEFAULT_BRAND: Readonly<ProjectBrand> = Object.freeze({
  appName: 'Lutris.ai',
  tagline: 'AI-Powered Design Tool',
  logoUrl: '',
  primaryColor: '#6366f1',
  secondaryColor: '#1e1e2e',
  accentColor: '#8b5cf6',
  fontFamily: 'Inter',
  borderRadius: '8',
})

// ── PRD Data ──

export interface ProjectPRD {
  content: string
  versions: DocVersion[]
  versionCounter: number
}

// ── Chat Data ──

export interface ProjectChat {
  messages: UIMessage[]
}

// ── Version Snapshot ──

export interface ProjectSnapshot {
  id: number
  timestamp: number
  label: string
  sceneData: string
}

// ── Unified Project Data ──
// Single source of truth for everything in a project.

export interface ProjectData {
  meta: ProjectMeta
  brand: ProjectBrand
  prd: ProjectPRD
  chat: ProjectChat
  snapshots: ProjectSnapshot[]
  /** Collaboration room ID — derived from project ID */
  collabRoomId: string
}

// ── Factory ──

let _counter = 0

export function generateProjectId(): string {
  return `proj_${Date.now()}_${(++_counter).toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
}

export function createProjectData(
  name: string,
  startPath: 'enterprise' | 'blank' = 'blank',
): ProjectData {
  const id = generateProjectId()
  const now = Date.now()
  return {
    meta: { id, name, startPath, createdAt: now, updatedAt: now },
    brand: { ...DEFAULT_BRAND },
    prd: { content: '', versions: [], versionCounter: 0 },
    chat: { messages: [] },
    snapshots: [],
    collabRoomId: `room_${id}`,
  }
}
