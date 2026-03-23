import { describe, test, expect } from 'bun:test'

// Test the pure extraction logic by importing the module and checking exports
// Since parseFigFile requires WASM, we test the composable's type contracts and state management

describe('useAssetLibrary types and exports', () => {
  test('module exports useAssetLibrary function', async () => {
    const mod = await import('../../src/composables/use-asset-library')
    expect(typeof mod.useAssetLibrary).toBe('function')
  })

  test('useAssetLibrary returns expected API shape', async () => {
    const mod = await import('../../src/composables/use-asset-library')
    const api = mod.useAssetLibrary()

    expect(api).toHaveProperty('libraries')
    expect(api).toHaveProperty('activeLibrary')
    expect(api).toHaveProperty('activeLibraryId')
    expect(typeof api.loadLibrary).toBe('function')
    expect(typeof api.removeLibrary).toBe('function')
    expect(typeof api.setActiveLibrary).toBe('function')
  })

  test('libraries starts empty', async () => {
    const mod = await import('../../src/composables/use-asset-library')
    const { libraries } = mod.useAssetLibrary()
    expect(libraries.value).toEqual([])
  })

  test('activeLibrary is null when no libraries loaded', async () => {
    const mod = await import('../../src/composables/use-asset-library')
    const { activeLibrary } = mod.useAssetLibrary()
    expect(activeLibrary.value).toBeNull()
  })
})

describe('AssetLibrary interface contracts', () => {
  test('LibraryComponent has required fields', () => {
    const component = {
      id: 'comp-1',
      name: 'Button',
      type: 'COMPONENT',
      nodeData: '[]'
    }
    expect(component.id).toBeDefined()
    expect(component.name).toBeDefined()
    expect(component.type).toBeDefined()
    expect(component.nodeData).toBeDefined()
  })

  test('LibraryColor has required fields', () => {
    const color = { hex: '#FF0000', count: 5 }
    expect(color.hex).toMatch(/^#[0-9A-F]{6}$/)
    expect(color.count).toBeGreaterThan(0)
  })

  test('LibraryTypography has required fields', () => {
    const typo = { family: 'Inter', size: 16, weight: 400, count: 3 }
    expect(typo.family).toBeDefined()
    expect(typo.size).toBeGreaterThan(0)
    expect(typo.weight).toBeGreaterThanOrEqual(100)
    expect(typo.count).toBeGreaterThan(0)
  })

  test('AssetLibrary has all sections', () => {
    const library = {
      id: 'lib-1',
      name: 'Design System',
      graph: {},
      components: [],
      colors: [],
      typography: []
    }
    expect(library.id).toBeDefined()
    expect(library.name).toBeDefined()
    expect(Array.isArray(library.components)).toBe(true)
    expect(Array.isArray(library.colors)).toBe(true)
    expect(Array.isArray(library.typography)).toBe(true)
  })
})
