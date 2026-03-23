import { describe, it, expect } from 'bun:test'

import { useCodeReview } from '../../src/composables/use-code-review'

import type { CodeReviewResult } from '../../src/composables/use-code-review'

describe('useCodeReview', () => {
  describe('getReviewPrompt', () => {
    it('should return a non-empty prompt string', () => {
      const { getReviewPrompt } = useCodeReview()
      const prompt = getReviewPrompt()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(100)
    })

    it('should mention brand, a11y, responsive, structure categories', () => {
      const { getReviewPrompt } = useCodeReview()
      const prompt = getReviewPrompt()
      expect(prompt).toContain('brand')
      expect(prompt).toContain('a11y')
      expect(prompt).toContain('responsive')
      expect(prompt).toContain('structure')
    })

    it('should request JSON output', () => {
      const { getReviewPrompt } = useCodeReview()
      const prompt = getReviewPrompt()
      expect(prompt).toContain('JSON')
    })
  })

  describe('parseReviewResponse', () => {
    it('should parse valid JSON response', () => {
      const { parseReviewResponse } = useCodeReview()
      const json = JSON.stringify({
        issues: [
          { line: 5, severity: 'warning', category: 'brand', message: 'Missing brand color' },
        ],
        score: 75,
        summary: 'Mostly good',
      })
      const result = parseReviewResponse(json)
      expect(result.issues).toHaveLength(1)
      expect(result.issues[0].line).toBe(5)
      expect(result.issues[0].severity).toBe('warning')
      expect(result.score).toBe(75)
      expect(result.summary).toBe('Mostly good')
    })

    it('should handle JSON wrapped in markdown fences', () => {
      const { parseReviewResponse } = useCodeReview()
      const response = '```json\n{"issues":[],"score":90,"summary":"Clean"}\n```'
      const result = parseReviewResponse(response)
      expect(result.score).toBe(90)
      expect(result.issues).toEqual([])
      expect(result.summary).toBe('Clean')
    })

    it('should return fallback on invalid JSON', () => {
      const { parseReviewResponse } = useCodeReview()
      const result = parseReviewResponse('not json at all')
      expect(result.issues).toEqual([])
      expect(result.score).toBe(0)
      expect(result.summary).toContain('Failed')
    })

    it('should handle missing fields gracefully', () => {
      const { parseReviewResponse } = useCodeReview()
      const result = parseReviewResponse('{}')
      expect(result.issues).toEqual([])
      expect(result.score).toBe(0)
      expect(result.summary).toBe('')
    })
  })

  describe('setReviewResult / clearReview', () => {
    it('should store and clear review result', () => {
      const { lastReview, setReviewResult, clearReview } = useCodeReview()
      expect(lastReview.value).toBeNull()

      const result: CodeReviewResult = {
        issues: [{ line: 1, severity: 'error', category: 'a11y', message: 'No alt text' }],
        score: 60,
        summary: 'Needs work',
      }
      setReviewResult(result)
      expect(lastReview.value).toEqual(result)

      clearReview()
      expect(lastReview.value).toBeNull()
    })
  })
})
