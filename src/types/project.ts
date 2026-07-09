// ── Unified Project Data Model ──
// All project data flows through these types.
// Every piece of state (PRD, brand, chat, design) is per-project.

import { createEmptyPipelineState } from '@/types/pipeline'
import { createEmptyDesignSystem } from '@/types/spec'
import type { PipelineState } from '@/types/pipeline'
import type { SpecDesignSystem, SpecPage, SpecTargetPlatform } from '@/types/spec'
import type { UIMessage } from 'ai'

// DocVersion 定义在 use-product-doc.ts 里，这里只引用类型（避免运行时依赖 composable）
export interface DocVersion {
  id: number
  content: string
  timestamp: number
  source: 'user' | 'design' | 'import' | 'ai'
  label?: string
}

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
// `content` / `freeformNotes` 保留自由文本备注（不再是唯一数据源）。
// `pages` 是结构化 Spec 的核心（PRD §11: Page → SpecComponent[]）。

export interface ProjectPRD {
  content: string
  versions: DocVersion[]
  versionCounter: number
  pages: SpecPage[]
  designSystem: SpecDesignSystem
  targetPlatform: SpecTargetPlatform
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
  /** Idea→Spec→Design→Dev 阶段路由状态（PRD 多 agent orchestrator） */
  pipeline: PipelineState
}

// ── Factory ──

let _counter = 0

export function generateProjectId(): string {
  return `proj_${Date.now()}_${(++_counter).toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`
}

export function createEmptyPRD(): ProjectPRD {
  return {
    content: '',
    versions: [],
    versionCounter: 0,
    pages: [],
    designSystem: createEmptyDesignSystem(),
    targetPlatform: 'web',
  }
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
    prd: createEmptyPRD(),
    chat: { messages: [] },
    snapshots: [],
    collabRoomId: `room_${id}`,
    pipeline: createEmptyPipelineState(),
  }
}
