import { describe, it, expect } from 'bun:test'

import {
  createEmptyBoard,
  createRequirement,
} from '../../src/types/requirements'

import type {
  Requirement,
  RequirementsBoard,
  RequirementPriority,
  RequirementStatus,
} from '../../src/types/requirements'

describe('createEmptyBoard', () => {
  it('should return a board with empty fields', () => {
    const board = createEmptyBoard()
    expect(board.problemStatement).toBe('')
    expect(board.personas).toEqual([])
    expect(board.requirements).toEqual([])
    expect(board.outOfScope).toEqual([])
    expect(board.successMetrics).toEqual([])
  })

  it('should return a new object each call', () => {
    const a = createEmptyBoard()
    const b = createEmptyBoard()
    expect(a).not.toBe(b)
    expect(a.requirements).not.toBe(b.requirements)
  })
})

describe('createRequirement', () => {
  it('should create a requirement with title and defaults', () => {
    const req = createRequirement('Login page')
    expect(req.title).toBe('Login page')
    expect(req.id.startsWith('req_')).toBe(true)
    expect(req.priority).toBe('P1')
    expect(req.status).toBe('draft')
    expect(req.description).toBe('')
    expect(req.userStory).toBe('')
    expect(req.acceptanceCriteria).toEqual([])
    expect(req.linkedNodeIds).toEqual([])
    expect(req.linkedChatMessageIds).toEqual([])
  })

  it('should accept partial overrides', () => {
    const req = createRequirement('Dashboard', {
      priority: 'P0',
      status: 'approved',
      description: 'Main dashboard view',
      userStory: 'As a user, I want to see my dashboard',
    })
    expect(req.priority).toBe('P0')
    expect(req.status).toBe('approved')
    expect(req.description).toBe('Main dashboard view')
    expect(req.userStory).toBe('As a user, I want to see my dashboard')
  })

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createRequirement('test').id))
    expect(ids.size).toBe(50)
  })

  it('should accept linkedNodeIds', () => {
    const req = createRequirement('Linked', {
      linkedNodeIds: ['node-1', 'node-2'],
    })
    expect(req.linkedNodeIds).toEqual(['node-1', 'node-2'])
  })

  it('should accept acceptance criteria', () => {
    const req = createRequirement('With AC', {
      acceptanceCriteria: [
        { id: 'ac1', description: 'Must load in 2s', met: false },
        { id: 'ac2', description: 'Must show error on failure', met: true },
      ],
    })
    expect(req.acceptanceCriteria).toHaveLength(2)
    expect(req.acceptanceCriteria[0].met).toBe(false)
    expect(req.acceptanceCriteria[1].met).toBe(true)
  })
})

describe('RequirementPriority type', () => {
  it('should support P0, P1, P2', () => {
    const priorities: RequirementPriority[] = ['P0', 'P1', 'P2']
    expect(priorities).toHaveLength(3)
  })
})

describe('RequirementStatus type', () => {
  it('should support all status values', () => {
    const statuses: RequirementStatus[] = ['draft', 'approved', 'in-progress', 'designed', 'delivered']
    expect(statuses).toHaveLength(5)
  })
})
