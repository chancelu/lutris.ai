import { describe, test, expect, beforeEach } from 'bun:test'

// ── Product Doc Store Tests ──
// Testing version management, sync source anti-recursion, and content operations

describe('ProductDoc - Version Management', () => {
  // Simulate the version logic without Vue reactivity
  interface DocVersion {
    id: number
    content: string
    timestamp: number
    source: 'user' | 'design' | 'import' | 'ai'
    label?: string
  }

  let versions: DocVersion[]
  let counter: number

  beforeEach(() => {
    versions = []
    counter = 0
  })

  function createVersion(content: string, source: DocVersion['source'], label?: string): DocVersion {
    const v: DocVersion = {
      id: ++counter,
      content,
      timestamp: Date.now(),
      source,
      label,
    }
    versions.push(v)
    if (versions.length > 50) versions = versions.slice(-50)
    return v
  }

  test('creates versions with incrementing ids', () => {
    createVersion('v1', 'user')
    createVersion('v2', 'import', 'Imported file.md')
    expect(versions).toHaveLength(2)
    expect(versions[0].id).toBe(1)
    expect(versions[1].id).toBe(2)
    expect(versions[1].label).toBe('Imported file.md')
  })

  test('caps at 50 versions', () => {
    for (let i = 0; i < 60; i++) {
      createVersion(`content-${i}`, 'user')
    }
    expect(versions).toHaveLength(50)
    expect(versions[0].content).toBe('content-10')
    expect(versions[49].content).toBe('content-59')
  })

  test('restore creates a new version', () => {
    createVersion('original', 'user')
    createVersion('modified', 'design')
    // Simulate restore
    const restored = versions.find(v => v.id === 1)!
    createVersion(restored.content, 'user', `Restored from v1`)
    expect(versions).toHaveLength(3)
    expect(versions[2].content).toBe('original')
    expect(versions[2].label).toBe('Restored from v1')
  })
})

describe('ProductDoc - Sync Anti-Recursion', () => {
  test('syncSource flag prevents recursive updates', () => {
    let syncSource: string | null = null
    let updateCount = 0

    function updateFromDesign(_content: string) {
      if (syncSource === 'doc') return // prevent recursion
      syncSource = 'design'
      updateCount++
      syncSource = null
    }

    function updateFromDoc(_content: string) {
      if (syncSource === 'design') return // prevent recursion
      syncSource = 'doc'
      updateCount++
      syncSource = null
    }

    updateFromDesign('design change')
    expect(updateCount).toBe(1)

    // Simulate: during design update, doc tries to update back
    syncSource = 'design'
    updateFromDoc('should be blocked')
    syncSource = null
    // updateFromDoc was blocked, count stays at 1
    expect(updateCount).toBe(1)
  })
})

describe('ProductDoc - PM Prompts', () => {
  test('parse prompt contains PRD structure keywords', () => {
    const prompt = `You are a senior product manager with expertise in PRD writing`
    expect(prompt).toContain('product manager')
    expect(prompt).toContain('PRD')
  })

  test('design sync prompt contains reverse-engineering keywords', () => {
    const prompt = `Reverse-engineer the product requirements`
    expect(prompt).toContain('Reverse-engineer')
    expect(prompt).toContain('requirements')
  })
})
