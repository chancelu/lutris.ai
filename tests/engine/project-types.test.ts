import { describe, it, expect } from 'bun:test'

import {
  createProjectData,
  generateProjectId,
  DEFAULT_BRAND,
} from '../../src/types/project'

import type { ProjectMeta, ProjectBrand, ProjectData } from '../../src/types/project'

// ── RED Phase: Tests written first ──

describe('generateProjectId', () => {
  it('should return a string starting with proj_', () => {
    const id = generateProjectId()
    expect(id.startsWith('proj_')).toBe(true)
  })

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateProjectId()))
    expect(ids.size).toBe(100)
  })

  it('should contain timestamp component', () => {
    const before = Date.now()
    const id = generateProjectId()
    const after = Date.now()
    // Extract timestamp from id: proj_{timestamp}_{counter}_{random}
    const parts = id.split('_')
    const ts = Number(parts[1])
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })
})

describe('DEFAULT_BRAND', () => {
  it('should have all required fields', () => {
    expect(DEFAULT_BRAND.appName).toBe('Lutris.ai')
    expect(DEFAULT_BRAND.primaryColor).toBe('#6366f1')
    expect(DEFAULT_BRAND.secondaryColor).toBe('#1e1e2e')
    expect(DEFAULT_BRAND.accentColor).toBe('#8b5cf6')
    expect(DEFAULT_BRAND.fontFamily).toBe('Inter')
    expect(DEFAULT_BRAND.borderRadius).toBe('8')
    expect(DEFAULT_BRAND.tagline).toBe('AI-Powered Design Tool')
    expect(DEFAULT_BRAND.logoUrl).toBe('')
  })

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(DEFAULT_BRAND)).toBe(true)
  })
})

describe('createProjectData', () => {
  it('should create a project with default blank start path', () => {
    const data = createProjectData('Test Project')
    expect(data.meta.name).toBe('Test Project')
    expect(data.meta.startPath).toBe('blank')
    expect(data.meta.id.startsWith('proj_')).toBe(true)
  })

  it('should create a project with enterprise start path', () => {
    const data = createProjectData('Enterprise', 'enterprise')
    expect(data.meta.startPath).toBe('enterprise')
  })

  it('should set timestamps to current time', () => {
    const before = Date.now()
    const data = createProjectData('Timed')
    const after = Date.now()
    expect(data.meta.createdAt).toBeGreaterThanOrEqual(before)
    expect(data.meta.createdAt).toBeLessThanOrEqual(after)
    expect(data.meta.updatedAt).toBe(data.meta.createdAt)
  })

  it('should initialize brand with defaults', () => {
    const data = createProjectData('Branded')
    expect(data.brand.appName).toBe(DEFAULT_BRAND.appName)
    expect(data.brand.primaryColor).toBe(DEFAULT_BRAND.primaryColor)
    expect(data.brand.fontFamily).toBe(DEFAULT_BRAND.fontFamily)
  })

  it('should not share brand reference with DEFAULT_BRAND', () => {
    const data = createProjectData('Isolated')
    data.brand.appName = 'Changed'
    expect(DEFAULT_BRAND.appName).toBe('Lutris.ai')
  })

  it('should initialize empty PRD', () => {
    const data = createProjectData('PRD Test')
    expect(data.prd.content).toBe('')
    expect(data.prd.versions).toEqual([])
    expect(data.prd.versionCounter).toBe(0)
  })

  it('should initialize empty chat', () => {
    const data = createProjectData('Chat Test')
    expect(data.chat.messages).toEqual([])
  })

  it('should initialize empty snapshots', () => {
    const data = createProjectData('Snap Test')
    expect(data.snapshots).toEqual([])
  })

  it('should derive collabRoomId from project id', () => {
    const data = createProjectData('Collab Test')
    expect(data.collabRoomId).toBe(`room_${data.meta.id}`)
  })

  it('should create unique projects each call', () => {
    const a = createProjectData('A')
    const b = createProjectData('B')
    expect(a.meta.id).not.toBe(b.meta.id)
    expect(a.collabRoomId).not.toBe(b.collabRoomId)
  })
})
