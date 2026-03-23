import { ref, readonly, computed } from 'vue'

import type {
  Requirement,
  RequirementsBoard,
  RequirementStatus,
  RequirementPriority,
} from '@/types/requirements'
import { createEmptyBoard, createRequirement } from '@/types/requirements'

// ── Per-Project Requirements Composable ──
// CRUD requirements, link to canvas nodes, compute coverage.

const board = ref<RequirementsBoard>(createEmptyBoard())

let _watchInit = false

function initWatch(): void {
  if (_watchInit) return
  _watchInit = true
  // Sync with project data via a dedicated IDB store
  // For now, store in the PRD data as an extension
}

// ── CRUD ──

function addRequirement(title: string, opts?: Partial<Omit<Requirement, 'id'>>): Requirement {
  const req = createRequirement(title, opts)
  board.value = {
    ...board.value,
    requirements: [...board.value.requirements, req],
  }
  return req
}

function updateRequirement(reqId: string, updates: Partial<Omit<Requirement, 'id'>>): void {
  board.value = {
    ...board.value,
    requirements: board.value.requirements.map((r) =>
      r.id === reqId ? { ...r, ...updates } : r
    ),
  }
}

function deleteRequirement(reqId: string): void {
  board.value = {
    ...board.value,
    requirements: board.value.requirements.filter((r) => r.id !== reqId),
  }
}

function updateStatus(reqId: string, status: RequirementStatus): void {
  updateRequirement(reqId, { status })
}

// ── Node Linking ──

function linkNodeToRequirement(nodeId: string, reqId: string): void {
  const req = board.value.requirements.find((r) => r.id === reqId)
  if (!req || req.linkedNodeIds.includes(nodeId)) return
  updateRequirement(reqId, {
    linkedNodeIds: [...req.linkedNodeIds, nodeId],
  })
}

function unlinkNodeFromRequirement(nodeId: string, reqId: string): void {
  const req = board.value.requirements.find((r) => r.id === reqId)
  if (!req) return
  updateRequirement(reqId, {
    linkedNodeIds: req.linkedNodeIds.filter((id) => id !== nodeId),
  })
}

// ── Coverage ──

const requirementCoverage = computed(() => {
  const reqs = board.value.requirements
  if (reqs.length === 0) return { total: 0, linked: 0, percentage: 0 }
  const linked = reqs.filter((r) => r.linkedNodeIds.length > 0).length
  return {
    total: reqs.length,
    linked,
    percentage: Math.round((linked / reqs.length) * 100),
  }
})

function getUnlinkedNodes(allNodeIds: string[]): string[] {
  const linkedIds = new Set(
    board.value.requirements.flatMap((r) => r.linkedNodeIds)
  )
  return allNodeIds.filter((id) => !linkedIds.has(id))
}

function getRequirementsForNode(nodeId: string): Requirement[] {
  return board.value.requirements.filter((r) =>
    r.linkedNodeIds.includes(nodeId)
  )
}

// ── Board-level updates ──

function updateBoard(updates: Partial<RequirementsBoard>): void {
  board.value = { ...board.value, ...updates }
}

function setBoard(newBoard: RequirementsBoard): void {
  board.value = newBoard
}

// ── AI parsing ──

function parseMarkdownToRequirements(parsedBoard: RequirementsBoard): void {
  // Merge parsed requirements, preserving existing links
  const existingMap = new Map(
    board.value.requirements.map((r) => [r.title.toLowerCase(), r])
  )

  const merged = parsedBoard.requirements.map((parsed) => {
    const existing = existingMap.get(parsed.title.toLowerCase())
    if (existing) {
      // Preserve links from existing
      return {
        ...parsed,
        id: existing.id,
        linkedNodeIds: existing.linkedNodeIds,
        linkedChatMessageIds: existing.linkedChatMessageIds,
      }
    }
    return parsed
  })

  board.value = {
    ...parsedBoard,
    requirements: merged,
  }
}

// ── Computed ──

const requirementsByStatus = computed(() => {
  const groups: Record<RequirementStatus, Requirement[]> = {
    draft: [],
    approved: [],
    'in-progress': [],
    designed: [],
    delivered: [],
  }
  for (const req of board.value.requirements) {
    groups[req.status].push(req)
  }
  return groups
})

const requirementsByPriority = computed(() => {
  const groups: Record<RequirementPriority, Requirement[]> = {
    P0: [],
    P1: [],
    P2: [],
  }
  for (const req of board.value.requirements) {
    groups[req.priority].push(req)
  }
  return groups
})

export function useRequirements() {
  initWatch()

  return {
    board: readonly(board),
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
