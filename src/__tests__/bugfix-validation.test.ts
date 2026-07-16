/**
 * Bug fix validation tests — 2026-03-31
 * Covers 7 fixes from user feedback rounds 1 & 2
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const src = (...parts: string[]) => resolve(__dirname, '..', ...parts)
const read = (...parts: string[]) => readFileSync(src(...parts), 'utf-8')

describe('Bug Fix Validation', () => {
  // ── Bug 1: Project Delete button in ProjectSwitcher ──
  describe('Bug 1: ProjectSwitcher has Delete button', () => {
    const code = read('components', 'ProjectSwitcher.vue')

    it('emits delete event', () => {
      expect(code).toContain("emit('delete'")
    })

    it('has trash icon button', () => {
      expect(code).toContain('icon-lucide-trash-2')
    })

    it('stops propagation on delete click', () => {
      expect(code).toMatch(/@click\.(stop|prevent)/)
    })
  })

  // ── Bug 1b: EditorView handles deleteProject ──
  describe('Bug 1b: EditorView handles delete-project', () => {
    const code = read('views', 'EditorView.vue')

    it('has @delete-project handler on TopBar', () => {
      expect(code).toContain('@delete-project=')
    })

    it('has onDeleteProject function', () => {
      expect(code).toContain('onDeleteProject')
    })

    it('calls deleteProject', () => {
      expect(code).toContain('deleteProject(')
    })
  })

  // ── Bug 1c: TopBar passes delete event ──
  describe('Bug 1c: TopBar passes delete event', () => {
    const code = read('components', 'TopBar.vue')

    it('emits deleteProject', () => {
      expect(code).toContain('deleteProject')
    })

    it('forwards @delete from ProjectSwitcher', () => {
      expect(code).toContain("@delete=")
    })
  })

  // ── Bug 2: AI Parse switches to AI Chat panel ──
  describe('Bug 2: AI Parse switches panel correctly', () => {
    const code = read('components', 'ProductDocPanel.vue')

    it('imports inlinePanel from useAIChat', () => {
      expect(code).toContain('inlinePanel')
    })

    it('sets inlinePanel to null in handleAIParse', () => {
      // Should set inlinePanel.value = null, NOT activeTab.value = 'ai'
      expect(code).toContain('inlinePanel.value = null')
    })

    it('does NOT use activeTab for panel switching in handleAIParse', () => {
      // Extract handleAIParse function body
      const match = code.match(/function handleAIParse\(\)[^}]+\{([\s\S]*?)\n\}/)
      if (match) {
        expect(match[1]).not.toContain("activeTab.value = 'ai'")
      }
    })
  })

  // ── Bug 3: AI Chat content is copyable ──
  describe('Bug 3: AI Chat content is copyable', () => {
    const css = read('app.css')

    it('has user-select:text override for chat bubbles', () => {
      expect(css).toContain('user-select: text !important')
    })

    it('targets chat-text-bubble', () => {
      expect(css).toContain('chat-text-bubble')
    })

    it('targets chat-markdown', () => {
      expect(css).toContain('chat-markdown')
    })
  })

  // ── Bug 4 (superseded 2026-07-15): hard-coded "Generate Design from Spec" button removed.
  // Root cause was two competing phase-advancement mechanisms (button-injected prompts vs.
  // conversation-driven submit_xxx_output tool calls). User chose Option C: kill the button,
  // let the AI judge phase advancement purely through conversation. Assert it stays gone.
  describe('Bug 4: SpecPanel no longer injects a forced render() prompt', () => {
    const code = read('components', 'SpecPanel.vue')

    it('does not contain a hard-coded CRITICAL INSTRUCTION prompt injection', () => {
      expect(code).not.toContain('CRITICAL INSTRUCTION')
    })

    it('does not call pendingSystemPrefix to force render()', () => {
      expect(code).not.toContain('pendingSystemPrefix')
    })
  })

  // ── Bug 7: Spec Save exits edit mode ──
  describe('Bug 7: Spec Save exits edit mode', () => {
    const code = read('components', 'ProductDocPanel.vue')

    it('saveEdit sets isEditing to false', () => {
      expect(code).toContain('isEditing.value = false')
    })

    it('uses nextTick for safe reactive flush', () => {
      expect(code).toContain('nextTick')
    })
  })
})
