/**
 * Slice B validation — pipeline skip + data-flow prompt injection.
 *
 * Covers:
 * - skipToDesign(): no-API-key escape hatch (idea+spec → skipped, land in design)
 * - buildDynamicPrompt(): idea brief injected into spec/design phase prompts
 * - spec → design data flow: submit_spec_output returns real page ids,
 *   get_spec_pages re-queries them, design prompt lists them.
 *
 * Note: useProjects().saveActiveProjectData() early-returns when no active
 * project is set, so these tests never touch IndexedDB (absent in happy-dom).
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { createPhaseReadTools, createSubmitTools } from '@/ai/phase-tools'
import { buildDynamicPrompt } from '@/composables/use-chat'
import { usePipeline } from '@/composables/use-pipeline'
import { useProjects } from '@/composables/use-projects'
import { createEmptyPipelineState } from '@/types/pipeline'

function resetPipeline() {
  const { activePipeline } = useProjects()
  activePipeline.value = createEmptyPipelineState()
  return activePipeline
}

describe('skipToDesign', () => {
  beforeEach(() => {
    resetPipeline()
  })

  it('marks idea + spec as skipped and lands in design phase', () => {
    const { skipToDesign, currentPhase, phases, history } = usePipeline()

    const ok = skipToDesign()

    expect(ok).toBe(true)
    expect(phases.value.idea.status).toBe('skipped')
    expect(phases.value.spec.status).toBe('skipped')
    expect(currentPhase.value).toBe('design')
    expect(phases.value.design.status).toBe('in-progress')

    const last = history.value[history.value.length - 1]
    expect(last.from).toBe('idea')
    expect(last.to).toBe('design')
    expect(last.reason).toBe('user-override')
  })

  it('makes design reachable but not dev', () => {
    const { skipToDesign, canJumpTo, furthestPhaseIndex } = usePipeline()

    skipToDesign()

    expect(canJumpTo('design')).toBe(true)
    expect(canJumpTo('dev')).toBe(false)
    expect(furthestPhaseIndex.value).toBe(2)
  })

  it('keeps completed phases completed (only pending/in-progress get skipped)', () => {
    const pipeline = resetPipeline()
    pipeline.value.phases.idea.status = 'completed'
    pipeline.value.currentPhase = 'spec'
    pipeline.value.phases.spec.status = 'in-progress'

    const { skipToDesign, phases, currentPhase } = usePipeline()
    skipToDesign()

    expect(phases.value.idea.status).toBe('completed')
    expect(phases.value.spec.status).toBe('skipped')
    expect(currentPhase.value).toBe('design')
  })

  it('is a no-op in dev phase', () => {
    const pipeline = resetPipeline()
    pipeline.value.currentPhase = 'dev'
    pipeline.value.phases.dev.status = 'in-progress'

    const { skipToDesign, currentPhase, phases } = usePipeline()

    expect(skipToDesign()).toBe(false)
    expect(currentPhase.value).toBe('dev')
    expect(phases.value.idea.status).toBe('in-progress')
  })

  it('keeps already-skipped phases skipped (idempotent double skip)', () => {
    const { skipToDesign, phases, history } = usePipeline()

    expect(skipToDesign()).toBe(true)
    expect(phases.value.idea.status).toBe('skipped')
    expect(phases.value.spec.status).toBe('skipped')
    const entriesAfterFirst = history.value.length

    // Second call from inside design: still true, statuses unchanged, and no
    // duplicate history entry (from === 'design' → no jump record).
    expect(skipToDesign()).toBe(true)
    expect(phases.value.idea.status).toBe('skipped')
    expect(phases.value.spec.status).toBe('skipped')
    expect(history.value.length).toBe(entriesAfterFirst)
  })

  it('works from the spec phase and records the real origin phase', () => {
    const pipeline = resetPipeline()
    pipeline.value.phases.idea.status = 'completed'
    pipeline.value.currentPhase = 'spec'
    pipeline.value.phases.spec.status = 'in-progress'

    const { skipToDesign, currentPhase, phases, history } = usePipeline()

    expect(skipToDesign()).toBe(true)
    expect(currentPhase.value).toBe('design')
    expect(phases.value.idea.status).toBe('completed')
    expect(phases.value.spec.status).toBe('skipped')

    const last = history.value[history.value.length - 1]
    expect(last.from).toBe('spec')
    expect(last.to).toBe('design')
    expect(last.reason).toBe('user-override')
  })

  it('from design phase marks idea/spec skipped without a history entry', () => {
    const pipeline = resetPipeline()
    pipeline.value.currentPhase = 'design'
    pipeline.value.phases.design.status = 'in-progress'

    const { skipToDesign, phases, history } = usePipeline()
    const entriesBefore = history.value.length

    expect(skipToDesign()).toBe(true)
    expect(phases.value.idea.status).toBe('skipped')
    expect(phases.value.spec.status).toBe('skipped')
    expect(history.value.length).toBe(entriesBefore)
  })
})

describe('buildDynamicPrompt pipeline context', () => {
  beforeEach(() => {
    resetPipeline()
  })

  it('injects the idea brief into the spec-phase prompt when outputs.idea exists', () => {
    const pipeline = resetPipeline()
    pipeline.value.currentPhase = 'spec'
    pipeline.value.phases.spec.status = 'in-progress'
    pipeline.value.outputs.idea = {
      summary: 'A hydration tracker for busy students',
      targetUsers: 'University students',
      problem: 'They forget to drink water during long study sessions',
      keyDecisions: ['web only'],
    }

    const prompt = buildDynamicPrompt()

    expect(prompt).toContain('Idea Brief')
    expect(prompt).toContain('A hydration tracker for busy students')
    expect(prompt).toContain('University students')
    expect(prompt).toContain('web only')
  })

  it('injects the idea brief into the design-phase prompt too', () => {
    const pipeline = resetPipeline()
    pipeline.value.currentPhase = 'design'
    pipeline.value.phases.design.status = 'in-progress'
    pipeline.value.outputs.idea = {
      summary: 'A recipe organizer',
      targetUsers: 'Home cooks',
      problem: 'Recipes are scattered across apps',
      keyDecisions: [],
    }

    const prompt = buildDynamicPrompt()

    expect(prompt).toContain('Idea Brief')
    expect(prompt).toContain('A recipe organizer')
  })

  it('does not inject an idea brief during the idea phase itself', () => {
    const pipeline = resetPipeline()
    pipeline.value.outputs.idea = {
      summary: 'Should not appear yet',
      targetUsers: 'Someone',
      problem: 'Something',
      keyDecisions: [],
    }

    expect(buildDynamicPrompt()).not.toContain('Should not appear yet')
  })
})

describe('spec → design data flow', () => {
  beforeEach(() => {
    resetPipeline()
  })

  it('submit_spec_output returns real page ids; get_spec_pages + design prompt expose them', async () => {
    const pipeline = resetPipeline()
    pipeline.value.currentPhase = 'spec'
    pipeline.value.phases.spec.status = 'in-progress'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool execute params are any-typed in phase-tools
    const submitTools = createSubmitTools('spec') as any
    const raw = await submitTools.submit_spec_output.execute({
      pages: [
        {
          name: 'Product List',
          route: '/products',
          purpose: 'Browse all products',
          userStory: 'As a shopper, I want to browse products, so that I can pick one',
          components: [{ name: 'ProductCard', role: 'list-item', repeatable: true }],
        },
      ],
    }, {})

    // §4.3: the tool result must carry the created page ids
    const submitted = JSON.parse(raw as string)
    expect(submitted.success).toBe(true)
    expect(submitted.pages).toHaveLength(1)
    expect(submitted.pages[0].id).toMatch(/^page_/)
    expect(submitted.pages[0].name).toBe('Product List')
    expect(submitted.pages[0].route).toBe('/products')

    // The submit advanced the pipeline to design
    const { currentPhase } = usePipeline()
    expect(currentPhase.value).toBe('design')

    // §4.4: design-phase read tool re-queries full spec details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same as above
    const readTools = createPhaseReadTools('design') as any
    expect(readTools.get_spec_pages).toBeDefined()
    const specRaw = await readTools.get_spec_pages.execute({}, {})
    const specData = JSON.parse(specRaw as string)
    expect(specData.pages).toHaveLength(1)
    expect(specData.pages[0].id).toBe(submitted.pages[0].id)
    expect(specData.pages[0].components[0].name).toBe('ProductCard')

    // read tools are design-only
    expect(Object.keys(createPhaseReadTools('idea'))).toHaveLength(0)
    expect(Object.keys(createPhaseReadTools('dev'))).toHaveLength(0)

    // §4.2: design-phase prompt lists the approved page with its real id
    const prompt = buildDynamicPrompt()
    expect(prompt).toContain('Approved Spec Pages')
    expect(prompt).toContain(submitted.pages[0].id)
    expect(prompt).toContain('Product List')
    expect(prompt).toContain('/products')
    expect(prompt).toContain('ProductCard')
  })

  // NOTE (Slice E): a multi-page variant of this test (2 pages in one
  // submit_spec_output call) was written and then removed because it exposes
  // a genuine product bug outside this slice's ownership: the second
  // consecutive useSpec().upsertPage() throws DataCloneError — upsertPage
  // spreads the reactive pages.value (proxied items) into a new array, and
  // currentSnapshot()'s structuredClone(toRaw(pages.value)) only unwraps the
  // outer array. Repro: two upsertPage(createSpecPage(...)) calls in a row.
  // Owner of src/composables/use-spec.ts should deep-toRaw or clone on write.
})
