import { ref, readonly, computed, toRaw } from 'vue'

import {
  saveDocumentToIDB,
  loadDocumentFromIDB,
  saveProjectMeta,
  listAllProjectMeta,
  saveBrandToIDB,
  loadBrandFromIDB,
  savePRDToIDB,
  loadPRDFromIDB,
  saveChatToIDB,
  loadChatFromIDB,
  saveSnapshotsToIDB,
  loadSnapshotsFromIDB,
  deleteProjectFromIDB,
  migrateLegacySession,
  DEFAULT_PROJECT_ID,
} from '@/stores/autosave-idb'
import {
  type ProjectBrand,
  type ProjectChat,
  type ProjectMeta,
  type ProjectPRD,
  type ProjectSnapshot,
  DEFAULT_BRAND,
  createProjectData,
} from '@/types/project'

import type { EditorStore } from '@/stores/editor'

// ── State ──

const projects = ref<ProjectMeta[]>([])
const activeProjectId = ref<string | null>(null)
const isSaving = ref(false)
const isLoading = ref(false)
const lastSavedAt = ref<number | null>(null)
const initialized = ref(false)

// Per-project data (loaded for active project)
const activeBrand = ref<ProjectBrand>({ ...DEFAULT_BRAND })
const activePRD = ref<ProjectPRD>({ content: '', versions: [], versionCounter: 0 })
const activeChat = ref<ProjectChat>({ messages: [] })
const activeSnapshots = ref<ProjectSnapshot[]>([])

let autosaveTimer: number | null = null
const AUTOSAVE_INTERVAL = 30000
const MAX_SNAPSHOTS = 30
let snapshotCounter = 0

// ── Computed ──

const activeProject = computed(() =>
  projects.value.find((p) => p.id === activeProjectId.value) ?? null
)
const projectCount = computed(() => projects.value.length)

// ── Persistence helpers ──

async function persistMeta(meta: ProjectMeta): Promise<void> {
  await saveProjectMeta(meta.id, meta)
}

async function saveActiveProjectData(): Promise<void> {
  const pid = activeProjectId.value
  if (!pid) return
  isSaving.value = true
  try {
    await Promise.all([
      saveBrandToIDB(pid, structuredClone(toRaw(activeBrand.value))),
      savePRDToIDB(pid, structuredClone(toRaw(activePRD.value))),
      saveChatToIDB(pid, structuredClone(toRaw(activeChat.value))),
      saveSnapshotsToIDB(pid, structuredClone(toRaw(activeSnapshots.value))),
    ])
    lastSavedAt.value = Date.now()
    // Update meta timestamp
    const meta = projects.value.find((p) => p.id === pid)
    if (meta) {
      const updated = { ...meta, updatedAt: Date.now() }
      projects.value = projects.value.map((p) => (p.id === pid ? updated : p))
      await persistMeta(updated)
    }
  } finally {
    isSaving.value = false
  }
}

async function loadProjectData(projectId: string): Promise<void> {
  isLoading.value = true
  try {
    const [brand, prd, chat, snapshots] = await Promise.all([
      loadBrandFromIDB(projectId),
      loadPRDFromIDB(projectId),
      loadChatFromIDB(projectId),
      loadSnapshotsFromIDB(projectId),
    ])
    activeBrand.value = brand ?? { ...DEFAULT_BRAND }
    activePRD.value = prd ?? { content: '', versions: [], versionCounter: 0 }
    activeChat.value = chat ?? { messages: [] }
    activeSnapshots.value = snapshots ?? []
    snapshotCounter = activeSnapshots.value.reduce((max, s) => Math.max(max, s.id), 0)
  } finally {
    isLoading.value = false
  }
}

// ── Project CRUD ──

async function createProject(
  name: string,
  startPath: 'enterprise' | 'blank' = 'blank',
): Promise<ProjectMeta> {
  const data = createProjectData(name, startPath)
  const meta = data.meta
  projects.value = [...projects.value, meta]
  await persistMeta(meta)
  // Initialize empty stores
  await Promise.all([
    saveBrandToIDB(meta.id, data.brand),
    savePRDToIDB(meta.id, data.prd),
    saveChatToIDB(meta.id, data.chat),
    saveSnapshotsToIDB(meta.id, data.snapshots),
  ])
  return meta
}

async function deleteProject(projectId: string): Promise<void> {
  projects.value = projects.value.filter((p) => p.id !== projectId)
  await deleteProjectFromIDB(projectId)
  if (activeProjectId.value === projectId) {
    activeProjectId.value = projects.value.length > 0 ? projects.value[0].id : null
    if (activeProjectId.value) {
      await loadProjectData(activeProjectId.value)
    }
  }
}

async function renameProject(projectId: string, name: string): Promise<void> {
  const meta = projects.value.find((p) => p.id === projectId)
  if (!meta) return
  const updated = { ...meta, name, updatedAt: Date.now() }
  projects.value = projects.value.map((p) => (p.id === projectId ? updated : p))
  await persistMeta(updated)
}

/**
 * Switch to a project. Saves current project data, loads new project data,
 * and optionally loads the .fig binary into the EditorStore.
 */
async function switchProject(
  projectId: string,
  editorStore?: EditorStore,
): Promise<ProjectMeta | null> {
  const meta = projects.value.find((p) => p.id === projectId)
  if (!meta) return null

  // Save current project before switching
  if (activeProjectId.value && activeProjectId.value !== projectId) {
    await saveActiveProjectData()
    // Save current design to IDB if editor available
    if (editorStore) {
      try {
        const figData = await editorStore.buildFigFile()
        await saveDocumentToIDB(activeProjectId.value, new Uint8Array(figData))
      } catch {
        // non-critical
      }
    }
  }

  activeProjectId.value = projectId
  await loadProjectData(projectId)

  // Load design from IDB into editor
  if (editorStore) {
    try {
      const figData = await loadDocumentFromIDB(projectId)
      if (figData) {
        const blob = new Blob([figData], { type: 'application/octet-stream' })
        const file = new File([blob], `${meta.name}.fig`)
        await editorStore.openFigFile(file)
      } else {
        // New project with no saved design — reset to blank canvas
        editorStore.resetToBlank(meta.name)
      }
    } catch {
      // non-critical — editor stays with current/empty state
    }
  }

  return meta
}

/** Save the current editor's design binary to IDB. */
async function saveCurrentDesign(editorStore: EditorStore): Promise<void> {
  const pid = activeProjectId.value
  if (!pid) return
  try {
    const figData = await editorStore.buildFigFile()
    await saveDocumentToIDB(pid, new Uint8Array(figData))
  } catch {
    // non-critical
  }
  await saveActiveProjectData()
}

// ── Snapshots ──

function createSnapshot(label?: string, getSceneData?: () => string): ProjectSnapshot | null {
  const pid = activeProjectId.value
  if (!pid) return null

  const sceneData = getSceneData ? getSceneData() : ''
  const snapshot: ProjectSnapshot = {
    id: ++snapshotCounter,
    timestamp: Date.now(),
    label: label ?? `Snapshot #${snapshotCounter}`,
    sceneData,
  }
  activeSnapshots.value = [...activeSnapshots.value, snapshot]
  if (activeSnapshots.value.length > MAX_SNAPSHOTS) {
    activeSnapshots.value = activeSnapshots.value.slice(-MAX_SNAPSHOTS)
  }
  // Fire-and-forget persist
  void saveSnapshotsToIDB(pid, activeSnapshots.value)
  return snapshot
}

function restoreSnapshot(snapshotId: number): string | null {
  const snapshot = activeSnapshots.value.find((s) => s.id === snapshotId)
  if (!snapshot) return null
  return snapshot.sceneData
}

function deleteSnapshot(snapshotId: number): void {
  activeSnapshots.value = activeSnapshots.value.filter((s) => s.id !== snapshotId)
  const pid = activeProjectId.value
  if (pid) void saveSnapshotsToIDB(pid, activeSnapshots.value)
}

// ── Autosave ──

function startAutosave(editorStore: EditorStore): void {
  stopAutosave()
  autosaveTimer = window.setInterval(() => {
    isSaving.value = true
    void saveCurrentDesign(editorStore)
      .finally(() => {
        setTimeout(() => { isSaving.value = false }, 500)
      })
  }, AUTOSAVE_INTERVAL)
}

function stopAutosave(): void {
  if (autosaveTimer !== null) {
    clearInterval(autosaveTimer)
    autosaveTimer = null
  }
}

// ── Initialization ──

async function init(): Promise<void> {
  if (initialized.value) return
  initialized.value = true

  // Migrate legacy single-session data
  const migrated = await migrateLegacySession()

  // Load all project metas from IDB
  const metas = await listAllProjectMeta()
  projects.value = metas.sort((a, b) => b.updatedAt - a.updatedAt)

  // If legacy data was migrated, ensure default project exists
  if (migrated && !projects.value.find((p) => p.id === DEFAULT_PROJECT_ID)) {
    const defaultMeta: ProjectMeta = {
      id: DEFAULT_PROJECT_ID,
      name: 'Recovered Session',
      startPath: 'blank',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    projects.value = [defaultMeta, ...projects.value]
    await persistMeta(defaultMeta)
  }

  // Also migrate localStorage projects if they exist
  await migrateLocalStorageProjects()

  // Create default project if none exist
  if (projects.value.length === 0) {
    const meta = await createProject('Untitled Project')
    activeProjectId.value = meta.id
  } else {
    activeProjectId.value = projects.value[0].id
  }

  // Load active project data
  if (activeProjectId.value) {
    await loadProjectData(activeProjectId.value)
  }
}

/** Migrate old localStorage-based projects to IDB. */
async function migrateLocalStorageProjects(): Promise<void> {
  try {
    const raw = localStorage.getItem('designflow-projects')
    if (!raw) return
    const data = JSON.parse(raw)
    const oldProjects: Array<{
      id: string
      name: string
      createdAt: number
      updatedAt: number
      currentSceneData: string
    }> = data.projects ?? []

    for (const old of oldProjects) {
      if (projects.value.find((p) => p.id === old.id)) continue
      const meta: ProjectMeta = {
        id: old.id,
        name: old.name,
        startPath: 'blank',
        createdAt: old.createdAt,
        updatedAt: old.updatedAt,
      }
      projects.value = [...projects.value, meta]
      await persistMeta(meta)
    }

    // Migrate global brand from localStorage
    const brandRaw = localStorage.getItem('Lutris.ai-brand')
    if (brandRaw && activeProjectId.value) {
      try {
        const brand = JSON.parse(brandRaw) as ProjectBrand
        await saveBrandToIDB(activeProjectId.value, brand)
        activeBrand.value = brand
      } catch { /* ignore */ }
    }

    // Migrate global PRD from localStorage
    const prdRaw = localStorage.getItem('designflow-product-doc')
    if (prdRaw && activeProjectId.value) {
      try {
        const prdData = JSON.parse(prdRaw)
        const prd: ProjectPRD = {
          content: prdData.content ?? '',
          versions: prdData.versions ?? [],
          versionCounter: prdData.versionCounter ?? 0,
        }
        await savePRDToIDB(activeProjectId.value, prd)
        activePRD.value = prd
      } catch { /* ignore */ }
    }

    // Remove migrated localStorage keys
    localStorage.removeItem('designflow-projects')
    // Keep brand/prd keys for now as fallback
  } catch {
    // ignore migration errors
  }
}

// ── Export ──

export function useProjects() {
  return {
    // State
    projects: readonly(projects),
    activeProjectId: readonly(activeProjectId),
    activeProject,
    projectCount,
    isSaving: readonly(isSaving),
    isLoading: readonly(isLoading),
    lastSavedAt: readonly(lastSavedAt),
    initialized: readonly(initialized),

    // Per-project reactive data
    activeBrand,
    activePRD,
    activeChat,
    activeSnapshots: readonly(activeSnapshots),

    // Project CRUD
    createProject,
    deleteProject,
    renameProject,
    switchProject,
    saveCurrentDesign,
    saveActiveProjectData,

    // Snapshots
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,

    // Autosave
    startAutosave,
    stopAutosave,

    // Init
    init,
  }
}
