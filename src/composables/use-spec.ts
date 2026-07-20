import { computed, readonly, ref, watch } from 'vue'

import { useProjects } from './use-projects'
import { deepRawClone } from '@/utils/deep-raw'
import {
  createEmptyDesignSystem,
  createSpecComponent,
  createSpecPage,
  summarizeSpec,
  type SpecComponent,
  type SpecDesignSystem,
  type SpecPage,
  type SpecSource,
  type SpecSnapshot,
  type SpecTargetPlatform,
  type SpecVersion,
} from '@/types/spec'

// ── Spec 状态（PRD §11 Page/SpecComponent 模型） ──
// summary（自由文本）仍保留用作兜底展示/AI prompt 拼接，但结构化数据源是 pages。

const pages = ref<SpecPage[]>([])
const designSystem = ref<SpecDesignSystem>(createEmptyDesignSystem())
const targetPlatform = ref<SpecTargetPlatform>('web')
const freeformNotes = ref('')
const versions = ref<SpecVersion[]>([])
const versionCounter = ref(0)

let initialized = false
let syncing = false

function currentSnapshot(): SpecSnapshot {
  return {
    projectName: '',
    createdFromIdeaBriefId: '',
    targetPlatform: targetPlatform.value,
    pages: deepRawClone(pages.value),
    designSystem: deepRawClone(designSystem.value),
    freeformNotes: freeformNotes.value,
  }
}

function syncFromProject() {
  const { activePRD } = useProjects()
  const prd = activePRD.value
  pages.value = deepRawClone(prd.pages ?? [])
  designSystem.value = deepRawClone(prd.designSystem ?? createEmptyDesignSystem())
  targetPlatform.value = prd.targetPlatform ?? 'web'
  freeformNotes.value = prd.content || ''
  versions.value = prd.versions.map((version) => ({
    id: version.id,
    timestamp: version.timestamp,
    source: version.source,
    label: version.label,
    snapshot: {
      projectName: '',
      createdFromIdeaBriefId: '',
      targetPlatform: targetPlatform.value,
      pages: pages.value,
      designSystem: designSystem.value,
      freeformNotes: version.content,
    },
  }))
  versionCounter.value = prd.versionCounter || 0
}

function syncToProject() {
  const { activePRD, saveActiveProjectData } = useProjects()
  syncing = true
  activePRD.value = {
    ...activePRD.value,
    content: freeformNotes.value,
    pages: deepRawClone(pages.value),
    designSystem: deepRawClone(designSystem.value),
    targetPlatform: targetPlatform.value,
    versions: versions.value.map((version) => ({
      id: version.id,
      timestamp: version.timestamp,
      source: version.source,
      label: version.label,
      content: version.snapshot.freeformNotes,
    })),
    versionCounter: versionCounter.value,
  }
  syncing = false
  void saveActiveProjectData()
}

function createVersion(source: SpecSource, label?: string) {
  const next: SpecVersion = {
    id: versionCounter.value + 1,
    timestamp: Date.now(),
    source,
    label,
    snapshot: currentSnapshot(),
  }
  versionCounter.value = next.id
  versions.value = [...versions.value, next].slice(-50)
}

// ── Freeform summary（兜底自由文本，仍供旧版展示/AI prompt 拼接使用） ──

function updateSummary(text: string, source: SpecSource = 'user', label?: string) {
  freeformNotes.value = text
  createVersion(source, label)
  syncToProject()
}

function appendSummary(text: string, source: SpecSource = 'ai', label?: string) {
  const separator = freeformNotes.value ? '\n\n---\n\n' : ''
  updateSummary(freeformNotes.value + separator + text, source, label)
}

// ── Page/Component CRUD（PRD §11 核心） ──

function replacePages(next: SpecPage[], source: SpecSource = 'ai', label?: string) {
  pages.value = deepRawClone(next)
  createVersion(source, label)
  syncToProject()
}

function upsertPage(page: SpecPage, source: SpecSource = 'ai', label?: string) {
  const idx = pages.value.findIndex((p) => p.id === page.id)
  if (idx >= 0) {
    pages.value = deepRawClone(pages.value.map((p) => (p.id === page.id ? page : p)))
  } else {
    pages.value = deepRawClone([...pages.value, page])
  }
  createVersion(source, label)
  syncToProject()
}

function removePage(pageId: string, source: SpecSource = 'user', label?: string) {
  pages.value = deepRawClone(pages.value.filter((p) => p.id !== pageId))
  createVersion(source, label)
  syncToProject()
}

function addComponentToPage(pageId: string, component: SpecComponent, source: SpecSource = 'ai', label?: string) {
  pages.value = deepRawClone(
    pages.value.map((p) =>
      p.id === pageId ? { ...p, components: [...p.components, component] } : p,
    ),
  )
  createVersion(source, label)
  syncToProject()
}

function updateDesignSystem(next: Partial<SpecDesignSystem>, source: SpecSource = 'user', label?: string) {
  designSystem.value = deepRawClone({ ...designSystem.value, ...next })
  createVersion(source, label)
  syncToProject()
}

function setTargetPlatform(platform: SpecTargetPlatform, source: SpecSource = 'user', label?: string) {
  targetPlatform.value = platform
  createVersion(source, label)
  syncToProject()
}

/**
 * 从 AI 生成的自然语言文本创建一个新页面草稿。
 * 目前落到 freeformNotes（供人工/AI 后续在 Spec 面板结构化拆解成 pages），
 * 不做脆弱的文本正则解析成 SpecPage —— 结构化数据应由 AI 工具直接调用
 * upsertPage/addComponentToPage 生成，而不是从散文里猜结构。
 */
function createSpecDraftFromAI(text: string) {
  updateSummary(`## Spec Draft\n\n${text}`, 'ai', 'Created spec draft from AI')
}

function restoreVersion(versionId: number) {
  const version = versions.value.find((item) => item.id === versionId)
  if (!version) return false
  pages.value = deepRawClone(version.snapshot.pages)
  designSystem.value = deepRawClone(version.snapshot.designSystem)
  targetPlatform.value = version.snapshot.targetPlatform
  freeformNotes.value = version.snapshot.freeformNotes
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

  const hasSpec = computed(() => freeformNotes.value.trim().length > 0 || pages.value.length > 0)
  const summary = computed(() => freeformNotes.value)
  const summaryFromPages = computed(() => summarizeSpec(currentSnapshot()))

  return {
    pages: readonly(pages),
    designSystem: readonly(designSystem),
    targetPlatform: readonly(targetPlatform),
    versions: readonly(versions),
    hasSpec,
    summary,
    summaryFromPages,
    syncFromProject,
    syncToProject,
    updateSummary,
    appendSummary,
    replacePages,
    upsertPage,
    removePage,
    addComponentToPage,
    updateDesignSystem,
    setTargetPlatform,
    createSpecDraftFromAI,
    restoreVersion,
    createSpecPage,
    createSpecComponent,
  }
}
