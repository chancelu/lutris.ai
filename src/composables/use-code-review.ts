import { ref, readonly } from 'vue'

// ── AI Code Review ──
// Reviews generated code for brand consistency, accessibility, responsive coverage, and structure.

export interface CodeIssue {
  line: number
  severity: 'error' | 'warning' | 'info'
  category: 'brand' | 'a11y' | 'responsive' | 'structure'
  message: string
}

export interface CodeReviewResult {
  issues: CodeIssue[]
  score: number // 0-100
  summary: string
}

const lastReview = ref<CodeReviewResult | null>(null)
const isReviewing = ref(false)

const CODE_REVIEW_PROMPT = `You are a senior frontend engineer reviewing generated UI code.

Analyze the code for these categories and return JSON:

1. **Brand Consistency** (category: "brand")
   - Are brand colors used via CSS custom properties (--brand-*)?
   - Is the brand font family applied?
   - Are border-radius values consistent with brand settings?

2. **Accessibility** (category: "a11y")
   - Color contrast: text on backgrounds must meet WCAG AA (4.5:1 for normal text, 3:1 for large)
   - ARIA: interactive elements need labels, roles where appropriate
   - Semantic HTML: headings hierarchy, landmark regions, alt text
   - Focus management: focusable elements, visible focus indicators

3. **Responsive Coverage** (category: "responsive")
   - Are media queries or responsive utilities present?
   - Do layouts use flexible units (%, fr, flex) vs fixed px?
   - Is viewport meta tag present (HTML output)?

4. **Component Structure** (category: "structure")
   - Are components properly named and scoped?
   - Is there prop typing (TypeScript interfaces)?
   - Are styles scoped or modular?

Output ONLY valid JSON:
{
  "issues": [{ "line": number, "severity": "error"|"warning"|"info", "category": "brand"|"a11y"|"responsive"|"structure", "message": "string" }],
  "score": number (0-100),
  "summary": "one-line summary"
}`

function getReviewPrompt(): string {
  return CODE_REVIEW_PROMPT
}

/** Parse AI response into CodeReviewResult. */
function parseReviewResponse(response: string): CodeReviewResult {
  try {
    // Strip markdown fences if present
    const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      summary: parsed.summary ?? '',
    }
  } catch {
    return { issues: [], score: 0, summary: 'Failed to parse review response' }
  }
}

function setReviewResult(result: CodeReviewResult): void {
  lastReview.value = result
}

function clearReview(): void {
  lastReview.value = null
}

export function useCodeReview() {
  return {
    lastReview: readonly(lastReview),
    isReviewing: readonly(isReviewing),
    getReviewPrompt,
    parseReviewResponse,
    setReviewResult,
    clearReview,
  }
}
