import { ref, readonly, computed } from 'vue'

// ── Role-Based Collaboration ──
// Roles stored in Yjs awareness state, UI adapts per role.

export type CollabRole = 'owner' | 'designer' | 'engineer' | 'reviewer'

export interface RoleConfig {
  label: string
  color: string
  permissions: {
    editCanvas: boolean
    editPRD: boolean
    editBrand: boolean
    exportCode: boolean
    approveReview: boolean
    manageProject: boolean
  }
}

export const ROLE_CONFIGS: Record<CollabRole, RoleConfig> = {
  owner: {
    label: 'Owner',
    color: '#f59e0b',
    permissions: {
      editCanvas: true,
      editPRD: true,
      editBrand: true,
      exportCode: true,
      approveReview: true,
      manageProject: true,
    },
  },
  designer: {
    label: 'Designer',
    color: '#8b5cf6',
    permissions: {
      editCanvas: true,
      editPRD: false,
      editBrand: true,
      exportCode: true,
      approveReview: false,
      manageProject: false,
    },
  },
  engineer: {
    label: 'Engineer',
    color: '#10b981',
    permissions: {
      editCanvas: false,
      editPRD: false,
      editBrand: false,
      exportCode: true,
      approveReview: false,
      manageProject: false,
    },
  },
  reviewer: {
    label: 'Reviewer',
    color: '#3b82f6',
    permissions: {
      editCanvas: false,
      editPRD: false,
      editBrand: false,
      exportCode: true,
      approveReview: true,
      manageProject: false,
    },
  },
}

const localRole = ref<CollabRole>('owner')

function setLocalRole(role: CollabRole): void {
  localRole.value = role
}

const permissions = computed(() => ROLE_CONFIGS[localRole.value].permissions)
const roleConfig = computed(() => ROLE_CONFIGS[localRole.value])

function canPerform(action: keyof RoleConfig['permissions']): boolean {
  return permissions.value[action]
}

/** Get awareness state payload for the local user's role. */
function getRoleAwarenessState(): { role: CollabRole; roleLabel: string; roleColor: string } {
  const config = ROLE_CONFIGS[localRole.value]
  return {
    role: localRole.value,
    roleLabel: config.label,
    roleColor: config.color,
  }
}

export function useRoles() {
  return {
    localRole: readonly(localRole),
    permissions,
    roleConfig,
    setLocalRole,
    canPerform,
    getRoleAwarenessState,
    ROLE_CONFIGS,
  }
}
