import { computed } from 'vue'

import { useSpec } from './use-spec'

import type {
  Requirement,
  RequirementsBoard,
  RequirementStatus,
  RequirementPriority,
} from '@/types/requirements'
import { createRequirement } from '@/types/requirements'

export function useRequirements() {
  const { requirementsBoard, replaceRequirementsBoard } = useSpec()

  const board = computed(() => requirementsBoard.value)

  function updateBoard(nextBoard: RequirementsBoard): void {
    replaceRequirementsBoard(nextBoard, 'user', 'Updated requirements board')
  }

  function addRequirement(title: string, opts?: Partial<Omit<Requirement, 'id'>>): Requirement {
    const req = createRequirement(title, opts)
    updateBoard({
      ...board.value,
      requirements: [...board.value.requirements, req],
    })
    return req
  }

  function updateRequirement(reqId: string, updates: Partial<Omit<Requirement, 'id'>>): void {
    updateBoard({
      ...board.value,
      requirements: board.value.requirements.map((req) =>
        req.id === reqId ? { ...req, ...updates } : req
      ),
    })
  }

  function deleteRequirement(reqId: string): void {
    updateBoard({
      ...board.value,
      requirements: board.value.requirements.filter((req) => req.id !== reqId),
    })
  }

  function updateStatus(reqId: string, status: RequirementStatus): void {
    updateRequirement(reqId, { status })
  }

  function linkNodeToRequirement(nodeId: string, reqId: string): void {
    const req = board.value.requirements.find((item) => item.id === reqId)
    if (!req || req.linkedNodeIds.includes(nodeId)) return
    updateRequirement(reqId, {
      linkedNodeIds: [...req.linkedNodeIds, nodeId],
    })
  }

  function unlinkNodeFromRequirement(nodeId: string, reqId: string): void {
    const req = board.value.requirements.find((item) => item.id === reqId)
    if (!req) return
    updateRequirement(reqId, {
      linkedNodeIds: req.linkedNodeIds.filter((id) => id !== nodeId),
    })
  }

  function getUnlinkedNodes(allNodeIds: string[]): string[] {
    const linkedIds = new Set(board.value.requirements.flatMap((req) => req.linkedNodeIds))
    return allNodeIds.filter((id) => !linkedIds.has(id))
  }

  function getRequirementsForNode(nodeId: string): Requirement[] {
    return board.value.requirements.filter((req) => req.linkedNodeIds.includes(nodeId))
  }

  function setBoard(newBoard: RequirementsBoard): void {
    replaceRequirementsBoard(newBoard, 'ai', 'Set requirements board')
  }

  function parseMarkdownToRequirements(parsedBoard: RequirementsBoard): void {
    const existingMap = new Map(board.value.requirements.map((req) => [req.title.toLowerCase(), req]))

    const merged = parsedBoard.requirements.map((parsed) => {
      const existing = existingMap.get(parsed.title.toLowerCase())
      if (!existing) return parsed
      return {
        ...parsed,
        id: existing.id,
        linkedNodeIds: existing.linkedNodeIds,
        linkedChatMessageIds: existing.linkedChatMessageIds,
      }
    })

    replaceRequirementsBoard({
      ...parsedBoard,
      requirements: merged,
    }, 'ai', 'Parsed markdown into requirements')
  }

  const requirementCoverage = computed(() => {
    const reqs = board.value.requirements
    if (reqs.length === 0) return { total: 0, linked: 0, percentage: 0 }
    const linked = reqs.filter((req) => req.linkedNodeIds.length > 0).length
    return {
      total: reqs.length,
      linked,
      percentage: Math.round((linked / reqs.length) * 100),
    }
  })

  const requirementsByStatus = computed(() => {
    const groups: Record<RequirementStatus, Requirement[]> = {
      draft: [],
      approved: [],
      'in-progress': [],
      designed: [],
      delivered: [],
    }
    for (const req of board.value.requirements) groups[req.status].push(req)
    return groups
  })

  const requirementsByPriority = computed(() => {
    const groups: Record<RequirementPriority, Requirement[]> = {
      P0: [],
      P1: [],
      P2: [],
    }
    for (const req of board.value.requirements) groups[req.priority].push(req)
    return groups
  })

  return {
    board,
    requirementCoverage,
    requirementsByStatus,
    requirementsByPriority,
    addRequirement,
    updateRequirement,
    deleteRequirement,
    updateStatus,
    linkNodeToRequirement,
    unlinkNodeFromRequirement,
    getUnlinkedNodes,
    getRequirementsForNode,
    updateBoard,
    setBoard,
    parseMarkdownToRequirements,
  }
}
