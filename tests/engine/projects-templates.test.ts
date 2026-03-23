import { describe, test, expect, beforeEach } from 'bun:test'

// ── Projects & Version Snapshots Tests ──

describe('Projects - CRUD', () => {
  interface ProjectSnapshot {
    id: number
    timestamp: number
    label: string
    sceneData: string
  }

  interface Project {
    id: string
    name: string
    createdAt: number
    updatedAt: number
    snapshots: ProjectSnapshot[]
    currentSceneData: string
  }

  let projects: Project[]
  let activeId: string | null
  let snapCounter: number

  beforeEach(() => {
    projects = []
    activeId = null
    snapCounter = 0
  })

  function createProject(name: string): Project {
    const p: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      snapshots: [],
      currentSceneData: '',
    }
    projects.push(p)
    activeId = p.id
    return p
  }

  function createSnapshot(label?: string): ProjectSnapshot | null {
    const p = projects.find(p => p.id === activeId)
    if (!p) return null
    const s: ProjectSnapshot = {
      id: ++snapCounter,
      timestamp: Date.now(),
      label: label ?? `Snapshot #${snapCounter}`,
      sceneData: p.currentSceneData,
    }
    p.snapshots.push(s)
    if (p.snapshots.length > 30) p.snapshots = p.snapshots.slice(-30)
    return s
  }

  test('create project', () => {
    const p = createProject('My App')
    expect(p.name).toBe('My App')
    expect(projects).toHaveLength(1)
    expect(activeId).toBe(p.id)
  })

  test('switch between projects', () => {
    const a = createProject('Project A')
    const b = createProject('Project B')
    expect(activeId).toBe(b.id)
    activeId = a.id
    expect(activeId).toBe(a.id)
  })

  test('rename project', () => {
    const p = createProject('Old Name')
    p.name = 'New Name'
    expect(p.name).toBe('New Name')
  })

  test('delete project switches active', () => {
    const a = createProject('A')
    const b = createProject('B')
    projects = projects.filter(p => p.id !== b.id)
    if (activeId === b.id) activeId = projects[0]?.id ?? null
    expect(activeId).toBe(a.id)
  })

  test('create snapshot', () => {
    const p = createProject('Test')
    p.currentSceneData = '{"nodes":[]}'
    const s = createSnapshot('Before refactor')
    expect(s).not.toBeNull()
    expect(s!.label).toBe('Before refactor')
    expect(s!.sceneData).toBe('{"nodes":[]}')
    expect(p.snapshots).toHaveLength(1)
  })

  test('snapshot cap at 30', () => {
    const p = createProject('Test')
    for (let i = 0; i < 35; i++) {
      p.currentSceneData = `data-${i}`
      createSnapshot()
    }
    expect(p.snapshots).toHaveLength(30)
    expect(p.snapshots[0].sceneData).toBe('data-5')
  })

  test('restore snapshot', () => {
    const p = createProject('Test')
    p.currentSceneData = 'original'
    createSnapshot('v1')
    p.currentSceneData = 'modified'
    // Restore
    const snap = p.snapshots.find(s => s.label === 'v1')!
    p.currentSceneData = snap.sceneData
    expect(p.currentSceneData).toBe('original')
  })
})

// ── Templates Tests ──

describe('Templates - Filtering', () => {
  interface Template {
    id: string
    name: string
    category: string
    prompt: string
  }

  const templates: Template[] = [
    { id: '1', name: 'Hero Landing', category: 'Landing', prompt: 'Create hero...' },
    { id: '2', name: 'Login Page', category: 'Auth', prompt: 'Create login...' },
    { id: '3', name: 'Dashboard', category: 'Dashboard', prompt: 'Create dashboard...' },
    { id: '4', name: 'Pricing Table', category: 'Landing', prompt: 'Create pricing...' },
  ]

  test('filter by category', () => {
    const landing = templates.filter(t => t.category === 'Landing')
    expect(landing).toHaveLength(2)
  })

  test('search by name', () => {
    const q = 'login'
    const results = templates.filter(t => t.name.toLowerCase().includes(q))
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('2')
  })

  test('combined filter', () => {
    const results = templates
      .filter(t => t.category === 'Landing')
      .filter(t => t.name.toLowerCase().includes('hero'))
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Hero Landing')
  })

  test('no results', () => {
    const results = templates.filter(t => t.name.toLowerCase().includes('zzz'))
    expect(results).toHaveLength(0)
  })
})
