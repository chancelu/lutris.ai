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

import { createPhaseReadTools, createReturnTool, createSubmitTools } from '@/ai/phase-tools'
import { buildDynamicPrompt } from '@/composables/use-chat'
import { usePipeline } from '@/composables/use-pipeline'
import { useProjects } from '@/composables/use-projects'
import { useSpec } from '@/composables/use-spec'
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

  // Regression (was Slice E removed test): a multi-page submit_spec_output
  // performs consecutive upsertPage() writes. Previously the 2nd write threw
  // DataCloneError ("structuredClone ... could not be cloned") because
  // upsertPage spread reactive proxied items into pages.value and
  // currentSnapshot()'s structuredClone(toRaw(...)) only unwrapped the outer
  // array. Fixed by deepRawClone on all use-spec write/snapshot paths.
  it('submit_spec_output with multiple pages does not throw DataCloneError', async () => {
    const pipeline = resetPipeline()
    pipeline.value.currentPhase = 'spec'
    pipeline.value.phases.spec.status = 'in-progress'

    const { replacePages } = useSpec()
    replacePages([], 'user', 'reset')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool execute params are any-typed in phase-tools
    const submitTools = createSubmitTools('spec') as any
    const raw = await submitTools.submit_spec_output.execute({
      pages: [
        {
          name: 'Today',
          route: '/today',
          purpose: 'See today\'s habits',
          userStory: 'As a parent, I want to see today\'s habits, so that I stay on track',
          components: [{ name: 'HabitCard', role: 'list-item', repeatable: true }],
        },
        {
          name: 'Routines',
          route: '/routines',
          purpose: 'Manage family routines',
          userStory: 'As a parent, I want to manage routines, so that the family shares them',
          components: [{ name: 'RoutineList', role: 'container' }],
        },
        {
          name: 'Family board',
          route: '/family',
          purpose: 'Shared family progress',
          userStory: 'As a kid, I want to see family progress, so that I feel motivated',
        },
      ],
    }, {})

    const submitted = JSON.parse(raw as string)
    expect(submitted.success).toBe(true)
    expect(submitted.pages).toHaveLength(3)

    // A follow-up write after reads (the exact old repro: second consecutive
    // upsertPage after pages.value round-tripped through the reactive ref)
    // must not throw either.
    const spec = useSpec()
    const extra = spec.createSpecPage('Extra', { route: '/extra', purpose: 'p', userStory: 'u' })
    expect(() => spec.upsertPage(extra, 'ai', 'extra')).not.toThrow()
    expect(spec.pages.value).toHaveLength(4)
  })

  // Regression: models regularly send malformed payloads — role outside the
  // picklist (Chinese, "display 组件"), components as bare strings, missing
  // userStory/route. A strict tool schema rejects these BEFORE execute with a
  // bare "An error occurred.", and the model retries the same payload (users
  // saw rows of red "Submit Spec Output — Error"). The tool now normalizes
  // anything page-shaped and only soft-fails (needsMoreInfo) on empty pages.
  it('submit_spec_output normalizes malformed model payloads instead of hard-failing', async () => {
    const pipeline = resetPipeline()
    pipeline.value.currentPhase = 'spec'
    pipeline.value.phases.spec.status = 'in-progress'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool execute params are any-typed in phase-tools
    const submitTools = createSubmitTools('spec') as any
    const raw = await submitTools.submit_spec_output.execute({
      pages: [
        {
          name: '首页',
          // route / purpose / userStory missing entirely
          components: [
            'Header', // bare string component
            { name: '打卡按钮', role: '操作按钮' }, // role outside the picklist
            { name: 'StreakList', role: 'list-item', repeatable: true },
          ],
        },
        { name: 'Circle', route: '/circle', purpose: 'p', userStory: 'u', components: 'oops' },
      ],
    }, {})

    const submitted = JSON.parse(raw as string)
    expect(submitted.success).toBe(true)
    expect(submitted.pages).toHaveLength(2)
    expect(submitted.pages[0].route).toBe('/') // fallback route, first page

    const spec = useSpec()
    const first = spec.pages.value.find((p) => p.name === '首页')!
    expect(first.components).toHaveLength(3)
    expect(first.components[0]).toMatchObject({ name: 'Header', role: 'display' })
    expect(first.components[1].role).toBe('display') // unknown role falls back
    expect(first.components[2]).toMatchObject({ name: 'StreakList', role: 'list-item', repeatable: true })
    const second = spec.pages.value.find((p) => p.name === 'Circle')!
    expect(second.components).toHaveLength(0) // non-array components tolerated
  })

  it('submit_spec_output with no pages soft-fails with needsMoreInfo instead of throwing', async () => {
    const pipeline = resetPipeline()
    pipeline.value.currentPhase = 'spec'
    pipeline.value.phases.spec.status = 'in-progress'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool execute params are any-typed in phase-tools
    const submitTools = createSubmitTools('spec') as any
    const result = await submitTools.submit_spec_output.execute({ pages: [] }, {})
    expect(result).toMatchObject({ success: false, needsMoreInfo: true })

    const { currentPhase } = usePipeline()
    expect(currentPhase.value).toBe('spec') // did NOT advance
  })
})

// The pipeline is iterative: an agent in dev must be able to walk the user
// back to design (or design → spec) instead of declaring the phase "locked"
// (real user report: dev-phase agent refused to touch the canvas).
describe('return_to_phase', () => {
  beforeEach(() => {
    resetPipeline()
  })

  it('is not offered in the idea phase (nowhere to go back to)', () => {
    expect(createReturnTool('idea')).toEqual({})
    expect(Object.keys(createReturnTool('spec'))).toContain('return_to_phase')
    expect(Object.keys(createReturnTool('design'))).toContain('return_to_phase')
    expect(Object.keys(createReturnTool('dev'))).toContain('return_to_phase')
  })

  it('dev → design jump succeeds and switches currentPhase', async () => {
    const pipeline = resetPipeline()
    pipeline.value.currentPhase = 'dev'
    pipeline.value.phases.design.status = 'completed'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool execute params are any-typed in phase-tools
    const tools = createReturnTool('dev') as any
    const result = await tools.return_to_phase.execute({ phase: 'design', reason: '改首页配色' }, {})

    expect(result).toMatchObject({ success: true })
    expect(usePipeline().currentPhase.value).toBe('design')
  })

  it('returning to a phase the project never reached soft-fails with needsMoreInfo', async () => {
    const pipeline = resetPipeline()
    pipeline.value.currentPhase = 'spec' // furthest = spec, design/dev unreachable

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool execute params are any-typed in phase-tools
    const tools = createReturnTool('spec') as any
    const result = await tools.return_to_phase.execute({ phase: 'design', reason: 'x' }, {})

    expect(result).toMatchObject({ success: false, needsMoreInfo: true })
    expect(usePipeline().currentPhase.value).toBe('spec')
  })

  it('returning to the current phase is a no-op success', async () => {
    const pipeline = resetPipeline()
    pipeline.value.currentPhase = 'design'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool execute params are any-typed in phase-tools
    const tools = createReturnTool('design') as any
    const result = await tools.return_to_phase.execute({ phase: 'design', reason: '继续改' }, {})

    expect(result).toMatchObject({ success: true })
    expect(usePipeline().currentPhase.value).toBe('design')
  })
})
