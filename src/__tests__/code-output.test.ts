/**
 * Slice E / E2 — code-output store unit tests.
 *
 * The store self-registers an onCodeExport listener at module scope (deep
 * import into packages/core/src/tools/export-code, the same module instance
 * the export_code tool notifies). These tests drive the seam exactly the way
 * the tool does: notifyCodeExport({ format, code, nodeCount }).
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { notifyCodeExport } from '../../packages/core/src/tools/export-code'
import { useCodeOutput } from '@/stores/code-output'

// The module-level listener is registered once per module instance; state is
// cumulative across tests in this file, so each test only asserts about the
// frameworks it has triggered itself.
describe('code-output store', () => {
  beforeEach(() => {
    // Date.now sanity anchor — exportedAt must be a fresh timestamp.
    expect(Date.now()).toBeGreaterThan(0)
  })

  it('captures a vue-sfc export notification with framework/files/exportedAt', () => {
    const before = Date.now()
    notifyCodeExport({ format: 'vue-sfc', code: '<template><div /></template>', nodeCount: 2 })

    const { output, hasCode } = useCodeOutput()
    expect(hasCode.value).toBe(true)
    expect(output.value).not.toBeNull()
    expect(output.value!.framework).toBe('Vue')
    expect(output.value!.files).toHaveLength(1)
    expect(output.value!.files[0].path).toBe('Component.vue')
    expect(output.value!.files[0].code).toBe('<template><div /></template>')
    expect(output.value!.exportedAt).toBeGreaterThanOrEqual(before)
  })

  it('caches each framework separately (per-framework tabs)', () => {
    notifyCodeExport({ format: 'react', code: 'export default function C() {}', nodeCount: 1 })
    notifyCodeExport({ format: 'html', code: '<html></html>', nodeCount: 1 })

    const { byFramework, availableFrameworks, output } = useCodeOutput()

    // Latest notification wins for `output` …
    expect(output.value!.framework).toBe('HTML')
    expect(output.value!.files[0].path).toBe('index.html')

    // … while every framework seen so far stays cached for the tabs.
    expect(availableFrameworks.value).toEqual(expect.arrayContaining(['Vue', 'React', 'HTML']))
    expect(byFramework.value.Vue!.files[0].path).toBe('Component.vue')
    expect(byFramework.value.React!.files[0].path).toBe('Component.tsx')
    expect(byFramework.value.HTML!.files[0].path).toBe('index.html')
  })

  it('a newer export replaces only its own framework cache entry', () => {
    notifyCodeExport({ format: 'vue-sfc', code: '<template><span>v2</span></template>', nodeCount: 3 })

    const { byFramework, output } = useCodeOutput()
    expect(output.value!.framework).toBe('Vue')
    expect(byFramework.value.Vue!.files[0].code).toContain('v2')
    // Untouched frameworks keep their previous payload.
    expect(byFramework.value.React!.files[0].code).toBe('export default function C() {}')
    expect(byFramework.value.HTML!.files[0].code).toBe('<html></html>')
  })
})
