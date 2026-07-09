import type { PipelineState } from '@/types/pipeline'
import type { ProjectBrand, ProjectChat, ProjectMeta, ProjectPRD, ProjectSnapshot } from '@/types/project'

// ── Multi-Project IndexedDB Storage ──
// Stores design documents per project + project metadata.
// Migrates legacy single-key `last-session` data on first open.

const DB_NAME = 'designflow-autosave'
const DB_VERSION = 3 // bumped from 2 to add pipeline store

// Object store names
const DOCUMENTS_STORE = 'documents'     // key: projectId, value: ArrayBuffer (.fig binary)
const META_STORE = 'project-meta'       // key: projectId, value: ProjectMeta
const BRAND_STORE = 'project-brand'     // key: projectId, value: ProjectBrand
const PRD_STORE = 'project-prd'         // key: projectId, value: ProjectPRD
const CHAT_STORE = 'project-chat'       // key: projectId, value: ProjectChat
const SNAPSHOTS_STORE = 'project-snapshots' // key: projectId, value: ProjectSnapshot[]
const PIPELINE_STORE = 'project-pipeline'   // key: projectId, value: PipelineState

const LEGACY_KEY = 'last-session'
const DEFAULT_PROJECT_ID = 'proj_default'

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (event) => {
      const db = req.result
      const oldVersion = event.oldVersion

      // v1 → v2: add project stores, keep documents store
      if (oldVersion < 1) {
        db.createObjectStore(DOCUMENTS_STORE)
      }
      if (oldVersion < 2) {
        db.createObjectStore(META_STORE)
        db.createObjectStore(BRAND_STORE)
        db.createObjectStore(PRD_STORE)
        db.createObjectStore(CHAT_STORE)
        db.createObjectStore(SNAPSHOTS_STORE)
      }
      if (oldVersion < 3) {
        db.createObjectStore(PIPELINE_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => { dbPromise = null; reject(req.error) }
  })
  return dbPromise
}

// ── Generic helpers ──

async function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // ignore
  }
}

async function idbGetAllKeys(storeName: string): Promise<string[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).getAllKeys()
      req.onsuccess = () => resolve(req.result as string[])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

// ── Document (design .fig binary) ──

export async function saveDocumentToIDB(projectId: string, data: ArrayBuffer | Uint8Array): Promise<void> {
  return idbPut(DOCUMENTS_STORE, projectId, data)
}

export async function loadDocumentFromIDB(projectId: string): Promise<ArrayBuffer | null> {
  return idbGet<ArrayBuffer>(DOCUMENTS_STORE, projectId)
}

export async function deleteDocumentFromIDB(projectId: string): Promise<void> {
  return idbDelete(DOCUMENTS_STORE, projectId)
}

// ── Project Meta ──

export async function saveProjectMeta(projectId: string, meta: ProjectMeta): Promise<void> {
  return idbPut(META_STORE, projectId, meta)
}

export async function loadProjectMeta(projectId: string): Promise<ProjectMeta | null> {
  return idbGet<ProjectMeta>(META_STORE, projectId)
}

export async function deleteProjectMeta(projectId: string): Promise<void> {
  return idbDelete(META_STORE, projectId)
}

export async function listProjectIds(): Promise<string[]> {
  return idbGetAllKeys(META_STORE)
}

export async function listAllProjectMeta(): Promise<ProjectMeta[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly')
      const req = tx.objectStore(META_STORE).getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

// ── Brand ──

export async function saveBrandToIDB(projectId: string, brand: ProjectBrand): Promise<void> {
  return idbPut(BRAND_STORE, projectId, brand)
}

export async function loadBrandFromIDB(projectId: string): Promise<ProjectBrand | null> {
  return idbGet<ProjectBrand>(BRAND_STORE, projectId)
}

// ── PRD ──

export async function savePRDToIDB(projectId: string, prd: ProjectPRD): Promise<void> {
  return idbPut(PRD_STORE, projectId, prd)
}

export async function loadPRDFromIDB(projectId: string): Promise<ProjectPRD | null> {
  return idbGet<ProjectPRD>(PRD_STORE, projectId)
}

// ── Chat ──

export async function saveChatToIDB(projectId: string, chat: ProjectChat): Promise<void> {
  return idbPut(CHAT_STORE, projectId, chat)
}

export async function loadChatFromIDB(projectId: string): Promise<ProjectChat | null> {
  return idbGet<ProjectChat>(CHAT_STORE, projectId)
}

// ── Snapshots ──

export async function saveSnapshotsToIDB(projectId: string, snapshots: ProjectSnapshot[]): Promise<void> {
  return idbPut(SNAPSHOTS_STORE, projectId, snapshots)
}

export async function loadSnapshotsFromIDB(projectId: string): Promise<ProjectSnapshot[] | null> {
  return idbGet<ProjectSnapshot[]>(SNAPSHOTS_STORE, projectId)
}

// ── Pipeline ──

export async function savePipelineToIDB(projectId: string, pipeline: PipelineState): Promise<void> {
  return idbPut(PIPELINE_STORE, projectId, pipeline)
}

export async function loadPipelineFromIDB(projectId: string): Promise<PipelineState | null> {
  return idbGet<PipelineState>(PIPELINE_STORE, projectId)
}

// ── Delete all data for a project ──

export async function deleteProjectFromIDB(projectId: string): Promise<void> {
  await Promise.all([
    deleteDocumentFromIDB(projectId),
    deleteProjectMeta(projectId),
    idbDelete(BRAND_STORE, projectId),
    idbDelete(PRD_STORE, projectId),
    idbDelete(CHAT_STORE, projectId),
    idbDelete(SNAPSHOTS_STORE, projectId),
    idbDelete(PIPELINE_STORE, projectId),
  ])
}

// ── Legacy migration ──
// Moves `last-session` document to the default project ID.

export async function migrateLegacySession(): Promise<boolean> {
  try {
    const data = await idbGet<ArrayBuffer>(DOCUMENTS_STORE, LEGACY_KEY)
    if (!data) return false

    await idbPut(DOCUMENTS_STORE, DEFAULT_PROJECT_ID, data)
    await idbDelete(DOCUMENTS_STORE, LEGACY_KEY)
    return true
  } catch {
    return false
  }
}

// ── Legacy API (backwards compat for editor.ts autosave) ──

export async function saveToIDB(data: ArrayBuffer | Uint8Array): Promise<void> {
  return saveDocumentToIDB(LEGACY_KEY, data)
}

export async function loadFromIDB(): Promise<ArrayBuffer | null> {
  return loadDocumentFromIDB(LEGACY_KEY)
}

export async function clearIDB(): Promise<void> {
  return deleteDocumentFromIDB(LEGACY_KEY)
}

export { DEFAULT_PROJECT_ID }
