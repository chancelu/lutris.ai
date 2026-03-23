// ── Structured Requirements Model ──
// PRD upgraded from free markdown to trackable requirements with coverage.

export type RequirementPriority = 'P0' | 'P1' | 'P2'

export type RequirementStatus =
  | 'draft'
  | 'approved'
  | 'in-progress'
  | 'designed'
  | 'delivered'

export interface AcceptanceCriterion {
  id: string
  description: string
  met: boolean
}

export interface Requirement {
  readonly id: string
  title: string
  description: string
  priority: RequirementPriority
  status: RequirementStatus
  userStory: string
  acceptanceCriteria: AcceptanceCriterion[]
  /** Canvas node IDs linked to this requirement */
  linkedNodeIds: string[]
  /** Chat message IDs that discussed this requirement */
  linkedChatMessageIds: string[]
}

export interface Persona {
  role: string
  context: string
  motivation: string
}

export interface SuccessMetric {
  metric: string
  target: string
  timeframe: string
}

export interface RequirementsBoard {
  problemStatement: string
  personas: Persona[]
  requirements: Requirement[]
  outOfScope: string[]
  successMetrics: SuccessMetric[]
}

export function createEmptyBoard(): RequirementsBoard {
  return {
    problemStatement: '',
    personas: [],
    requirements: [],
    outOfScope: [],
    successMetrics: [],
  }
}

let _reqCounter = 0

export function createRequirement(
  title: string,
  opts?: Partial<Omit<Requirement, 'id'>>,
): Requirement {
  return {
    id: `req_${Date.now()}_${(++_reqCounter).toString(36)}`,
    title,
    description: opts?.description ?? '',
    priority: opts?.priority ?? 'P1',
    status: opts?.status ?? 'draft',
    userStory: opts?.userStory ?? '',
    acceptanceCriteria: opts?.acceptanceCriteria ?? [],
    linkedNodeIds: opts?.linkedNodeIds ?? [],
    linkedChatMessageIds: opts?.linkedChatMessageIds ?? [],
  }
}
