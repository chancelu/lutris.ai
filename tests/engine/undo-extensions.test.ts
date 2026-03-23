import { describe, test, expect } from 'bun:test'
import { UndoManager } from '@open-pencil/core'

describe('UndoManager - P3 Extensions', () => {
  test('undoEntries returns readonly list of labels', () => {
    const undo = new UndoManager()
    undo.push({ label: 'Move', forward: () => {}, inverse: () => {} })
    undo.push({ label: 'Resize', forward: () => {}, inverse: () => {} })

    const entries = undo.undoEntries
    expect(entries).toHaveLength(2)
    expect(entries[0].label).toBe('Move')
    expect(entries[1].label).toBe('Resize')
  })

  test('redoEntries returns readonly list after undo', () => {
    const undo = new UndoManager()
    undo.push({ label: 'A', forward: () => {}, inverse: () => {} })
    undo.push({ label: 'B', forward: () => {}, inverse: () => {} })
    undo.undo()

    expect(undo.redoEntries).toHaveLength(1)
    expect(undo.redoEntries[0].label).toBe('B')
    expect(undo.undoEntries).toHaveLength(1)
  })

  test('undoCount and redoCount', () => {
    const undo = new UndoManager()
    expect(undo.undoCount).toBe(0)
    expect(undo.redoCount).toBe(0)

    undo.push({ label: 'X', forward: () => {}, inverse: () => {} })
    undo.push({ label: 'Y', forward: () => {}, inverse: () => {} })
    expect(undo.undoCount).toBe(2)

    undo.undo()
    expect(undo.undoCount).toBe(1)
    expect(undo.redoCount).toBe(1)
  })

  test('clear resets all entries', () => {
    const undo = new UndoManager()
    undo.push({ label: 'A', forward: () => {}, inverse: () => {} })
    undo.undo()
    undo.clear()

    expect(undo.undoEntries).toHaveLength(0)
    expect(undo.redoEntries).toHaveLength(0)
    expect(undo.undoCount).toBe(0)
    expect(undo.redoCount).toBe(0)
  })
})
