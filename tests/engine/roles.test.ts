import { describe, it, expect } from 'bun:test'

import { ROLE_CONFIGS } from '../../src/composables/use-roles'

import type { CollabRole, RoleConfig } from '../../src/composables/use-roles'

describe('ROLE_CONFIGS', () => {
  it('should define all four roles', () => {
    const roles: CollabRole[] = ['owner', 'designer', 'engineer', 'reviewer']
    for (const role of roles) {
      expect(ROLE_CONFIGS[role]).toBeDefined()
      expect(ROLE_CONFIGS[role].label).toBeTruthy()
      expect(ROLE_CONFIGS[role].color).toMatch(/^#/)
    }
  })

  it('owner should have all permissions', () => {
    const perms = ROLE_CONFIGS.owner.permissions
    expect(perms.editCanvas).toBe(true)
    expect(perms.editPRD).toBe(true)
    expect(perms.editBrand).toBe(true)
    expect(perms.exportCode).toBe(true)
    expect(perms.approveReview).toBe(true)
    expect(perms.manageProject).toBe(true)
  })

  it('designer should edit canvas and brand but not PRD or manage', () => {
    const perms = ROLE_CONFIGS.designer.permissions
    expect(perms.editCanvas).toBe(true)
    expect(perms.editBrand).toBe(true)
    expect(perms.editPRD).toBe(false)
    expect(perms.approveReview).toBe(false)
    expect(perms.manageProject).toBe(false)
  })

  it('engineer should only export code', () => {
    const perms = ROLE_CONFIGS.engineer.permissions
    expect(perms.editCanvas).toBe(false)
    expect(perms.editPRD).toBe(false)
    expect(perms.editBrand).toBe(false)
    expect(perms.exportCode).toBe(true)
    expect(perms.approveReview).toBe(false)
    expect(perms.manageProject).toBe(false)
  })

  it('reviewer should approve reviews and export code', () => {
    const perms = ROLE_CONFIGS.reviewer.permissions
    expect(perms.editCanvas).toBe(false)
    expect(perms.exportCode).toBe(true)
    expect(perms.approveReview).toBe(true)
    expect(perms.manageProject).toBe(false)
  })

  it('each role should have a unique color', () => {
    const colors = Object.values(ROLE_CONFIGS).map((c) => c.color)
    expect(new Set(colors).size).toBe(colors.length)
  })
})
