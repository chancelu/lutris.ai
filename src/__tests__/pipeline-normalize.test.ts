/**
 * P0 regression — pipeline restore normalization.
 *
 * A pipeline restored from IDB could miss phase keys (older saves predate the
 * 4-phase shape), and the restored object used to be attached to
 * activePipeline verbatim. Every consumer iterating PIPELINE_PHASES then hit
 * `phases[phase] === undefined` and crashed at render time.
 *
 * normalizePipelineState() merges saved state onto the default empty state.
 */
import { describe, expect, it } from 'vitest'

import {
  createEmptyPipelineState,
  normalizePipelineState,
  PIPELINE_PHASES,
} from '@/types/pipeline'

import type { PipelineState } from '@/types/pipeline'

describe('normalizePipelineState', () => {
  it('returns the default empty state for null/undefined/garbage input', () => {
    for (const input of [null, undefined, 42, 'idea', []] as const) {
      const state = normalizePipelineState(input as unknown as Partial<PipelineState>)
      expect(state.currentPhase).toBe('idea')
      for (const phase of PIPELINE_PHASES) {
        expect(state.phases[phase]).toBeDefined()
        expect(state.phases[phase].status).toBeDefined()
        expect(state.phases[phase].validationFailCount).toBe(0)
      }
      expect(state.history.length).toBeGreaterThan(0)
    }
  })

  it('fills in missing phase keys from a partial legacy save', () => {
    // Legacy shape: only idea/spec exist, design/dev missing entirely
    const legacy = {
      currentPhase: 'spec',
      phases: {
        idea: { status: 'completed', validationFailCount: 1, completedAt: 123 },
        spec: { status: 'in-progress', validationFailCount: 0 },
      },
      outputs: {},
      history: [{ from: null, to: 'idea', timestamp: 1, reason: 'init' }],
    } as unknown as Partial<PipelineState>

    const state = normalizePipelineState(legacy)

    expect(state.currentPhase).toBe('spec')
    expect(state.phases.idea.status).toBe('completed')
    expect(state.phases.idea.validationFailCount).toBe(1)
    expect(state.phases.spec.status).toBe('in-progress')
    // Missing keys backfilled — this is what the stepper crash needed
    expect(state.phases.design.status).toBe('pending')
    expect(state.phases.dev.status).toBe('pending')
    for (const phase of PIPELINE_PHASES) {
      expect(typeof state.phases[phase].status).toBe('string')
    }
  })

  it('backfills missing fields inside an individual phase record', () => {
    const partial = {
      currentPhase: 'design',
      phases: {
        idea: { status: 'skipped' }, // no validationFailCount
        spec: { status: 'skipped' },
        design: { status: 'in-progress' },
        dev: { status: 'pending' },
      },
    } as unknown as Partial<PipelineState>

    const state = normalizePipelineState(partial)

    expect(state.phases.idea.status).toBe('skipped')
    expect(state.phases.idea.validationFailCount).toBe(0)
  })

  it('falls back to idea when currentPhase is unrecognized', () => {
    const bad = {
      ...createEmptyPipelineState(),
      currentPhase: 'ship', // stale phase name from an old build
    } as unknown as Partial<PipelineState>

    expect(normalizePipelineState(bad).currentPhase).toBe('idea')
  })

  it('preserves a well-formed current save unchanged', () => {
    const good = createEmptyPipelineState()
    good.currentPhase = 'design'
    good.phases.idea.status = 'skipped'
    good.phases.spec.status = 'skipped'
    good.phases.design.status = 'in-progress'
    good.outputs.idea = { summary: 's', targetUsers: 'u', problem: 'p', keyDecisions: [] }

    const state = normalizePipelineState(good)

    expect(state.currentPhase).toBe('design')
    expect(state.phases.idea.status).toBe('skipped')
    expect(state.outputs.idea?.summary).toBe('s')
    expect(state.history).toEqual(good.history)
  })

  it('replaces an empty history with the init entry', () => {
    const state = normalizePipelineState({ phases: {}, history: [] } as unknown as Partial<PipelineState>)
    expect(state.history).toHaveLength(1)
    expect(state.history[0].reason).toBe('init')
  })
})
