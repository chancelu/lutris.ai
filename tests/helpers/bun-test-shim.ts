/**
 * bun:test → vitest compatibility shim (Slice E / E1).
 *
 * Wired in vitest.config.ts as a resolve alias so that every
 * `import { ... } from 'bun:test'` in tests/engine resolves here and runs
 * under vitest unchanged.
 *
 * Mapping:
 *  - describe / test / it / expect / beforeAll / beforeEach / afterAll /
 *    afterEach  → re-exported from vitest (vitest supports .if/.skip/.only/
 *    .todo/.each with the same semantics bun:test has, so `describe.if` used
 *    by tests/helpers/test-utils.ts for BUN_HEAVY_TESTS gating works as-is).
 *  - mock(fn?)  → vi.fn(fn?)  (bun's mock() is a jest-style fn wrapper).
 *  - setDefaultTimeout(ms) → no-op (per-file timeouts are handled by
 *    testTimeout in vitest.config.ts instead).
 *
 * Bun runtime APIs (Bun.file / Bun.spawn) are NOT part of this module — a
 * minimal `Bun` global is installed by tests/helpers/vitest-setup.ts
 * (setupFiles), which rescues every engine file that only reads files.
 *
 * Final excluded set (still listed in vitest.config.ts `exclude`, with the
 * reason being they shell out to the `bun` binary which is unavailable in
 * this environment):
 *  - tests/engine/eval-cli.test.ts   (Bun.spawn(['bun', CLI, ...]))
 *  - tests/engine/tools-cli.test.ts  (Bun.spawn(['bun', CLI, 'eval', ...]))
 *
 * Everything else in tests/engine runs under vitest, including the former
 * Bun.file users (mcp, render-text, renderer-effects) via the Bun global in
 * vitest-setup.ts and the former setDefaultTimeout users
 * (fig-export-worker, fig-roundtrip) via the no-op above + testTimeout.
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  test,
  vi,
} from 'vitest'

export { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test }

// vitest exposes skipIf/runIf but not bun:test's `.if` alias — add it so
// `describe.if(!!process.env.BUN_HEAVY_TESTS)` gating keeps working as-is.
type CondFn = (cond: boolean) => typeof describe
;(describe as unknown as { if?: CondFn }).if ??= ((cond: boolean) =>
  (cond ? describe : describe.skip)) as CondFn
;(test as unknown as { if?: (cond: boolean) => typeof test }).if ??= ((cond: boolean) =>
  cond ? test : test.skip) as (cond: boolean) => typeof test

/** bun:test `mock(fn?)` → vitest `vi.fn(fn?)` */
export function mock<T extends (...args: never[]) => unknown>(fn?: T) {
  return vi.fn(fn)
}

/** bun:test `setDefaultTimeout(ms)` — superseded by vitest testTimeout. */
export function setDefaultTimeout(_ms: number): void {
  /* no-op under vitest */
}
