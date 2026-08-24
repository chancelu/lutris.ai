/**
 * P1 unit tests — user-driven phase actions (use-phase-actions).
 *
 * These are the "user button" counterparts of the AI submit_xxx tools:
 * - buildPageNodeMap(): heuristic SpecPage.id → canvas Frame id mapping
 * - finishDesignAndGoToDev(): design → dev advance with toast on failure
 * - exportCodeDirectly(): no-AI code export straight into the code-output store
 */
import { beforeEach, describe, expect, it } from 'vitest'

import {
  buildPageNodeMap,
  exportCodeDirectly,
  finishDesignAndGoToDev,
} from '@/composables/use-phase-actions'
import { usePipeline } from '@/composables/use-pipeline'
import { useProjects } from '@/composables/use-projects'
import { useSpec } from '@/composables/use-spec'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import { useCodeOutput } from '@/stores/code-output'
import { createEmptyPipelineState } from '@/types/pipeline'

function setupStore() {
  const store = createEditorStore()
  setActiveEditorStore(store)
  return store
}

function resetPipeline(phase: 'idea' | 'spec' | 'design' | 'dev' = 'design') {
  const { activePipeline } = useProjects()
  activePipeline.value = createEmptyPipelineState()
  activePipeline.value.currentPhase = phase
  activePipeline.value.phases[phase].status = 'in-progress'
  return activePipeline
}

function resetSpec() {
  useSpec().replacePages([], 'user', 'reset')
}

describe('buildPageNodeMap', () => {
  beforeEach(() => {
    resetPipeline('design')
    resetSpec()
  })

  it('returns null when the canvas has no frames', () => {
    setupStore()
    expect(buildPageNodeMap()).toBeNull()
  })

  it('maps spec pages to frames by exact name match', () => {
    const store = setupStore()
    const listId = store.createShape('FRAME', 0, 0, 400, 300)
    store.renameNode(listId, '商品列表页')
    const detailId = store.createShape('FRAME', 500, 0, 400, 300)
    store.renameNode(detailId, '商品详情页')

    const spec = useSpec()
    const p1 = spec.createSpecPage('商品列表页', { route: '/products', purpose: 'p', userStory: 'u' })
    const p2 = spec.createSpecPage('商品详情页', { route: '/detail', purpose: 'p', userStory: 'u' })
    spec.upsertPage(p1, 'user', 'add')
    spec.upsertPage(p2, 'user', 'add')

    const map = buildPageNodeMap()
    expect(map).toEqual({ [p1.id]: listId, [p2.id]: detailId })
  })

  it('falls back to fuzzy then positional matching for unmatched names', () => {
    const store = setupStore()
    const a = store.createShape('FRAME', 0, 0, 100, 100)
    store.renameNode(a, '首页 v2') // fuzzy-contains "首页"
    const b = store.createShape('FRAME', 200, 0, 100, 100)
    store.renameNode(b, 'Unrelated')

    const spec = useSpec()
    const p1 = spec.createSpecPage('首页', { route: '/', purpose: 'p', userStory: 'u' })
    const p2 = spec.createSpecPage('设置', { route: '/settings', purpose: 'p', userStory: 'u' })
    spec.upsertPage(p1, 'user', 'add')
    spec.upsertPage(p2, 'user', 'add')

    const map = buildPageNodeMap()
    expect(map![p1.id]).toBe(a) // fuzzy name match
    expect(map![p2.id]).toBe(b) // positional fallback
  })

  it('degrades to frame-id keys when there is no spec (skipToDesign path)', () => {
    const store = setupStore()
    const id = store.createShape('FRAME', 0, 0, 100, 100)
    const map = buildPageNodeMap()
    expect(map).toEqual({ [id]: id })
  })
})

describe('finishDesignAndGoToDev', () => {
  beforeEach(() => {
    resetPipeline('design')
    resetSpec()
  })

  it('refuses to advance with an empty canvas', () => {
    setupStore()
    expect(finishDesignAndGoToDev()).toBe(false)
    expect(usePipeline().currentPhase.value).toBe('design')
  })

  it('advances design → dev with a populated pageNodeMap', () => {
    const store = setupStore()
    const id = store.createShape('FRAME', 0, 0, 375, 812)
    store.renameNode(id, '首页')

    expect(finishDesignAndGoToDev()).toBe(true)

    const { currentPhase, phases, outputs } = usePipeline()
    expect(currentPhase.value).toBe('dev')
    expect(phases.value.design.status).toBe('completed')
    expect(outputs.value.design?.pageNodeMap).toEqual({ [id]: id })
  })

  it('rejects when currentPhase is not design', () => {
    setupStore()
    resetPipeline('dev')
    useProjects().activePipeline.value.phases.dev.status = 'in-progress'
    expect(finishDesignAndGoToDev()).toBe(false)
  })
})

describe('exportCodeDirectly', () => {
  beforeEach(() => {
    resetPipeline('dev')
    useProjects().activePipeline.value.phases.dev.status = 'in-progress'
    resetSpec()
  })

  it('returns false on an empty canvas', () => {
    setupStore()
    expect(exportCodeDirectly()).toBe(false)
  })

  it('feeds Vue + React payloads into the code-output store without any AI', () => {
    const store = setupStore()
    const frameId = store.createShape('FRAME', 0, 0, 200, 100)
    store.renameNode(frameId, 'Card')

    expect(exportCodeDirectly()).toBe(true)

    const { output, availableFrameworks } = useCodeOutput()
    expect(output.value).not.toBeNull()
    expect(availableFrameworks.value).toEqual(expect.arrayContaining(['Vue', 'React']))
    expect(output.value!.files[0].code.length).toBeGreaterThan(0)
  })
})
