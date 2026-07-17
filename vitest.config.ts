import { resolve } from 'path'
import { configDefaults, defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Slice E / E1: run the bun:test engine suite under vitest.
      // See tests/helpers/bun-test-shim.ts for the mapping and the
      // documented set of excluded Bun-runtime files.
      'bun:test': resolve(__dirname, 'tests/helpers/bun-test-shim.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/__tests__/**/*.test.ts', 'tests/engine/**/*.test.ts'],
    exclude: [
      ...configDefaults.exclude,
      // Spawn the `bun` binary, which is unavailable outside Bun — see
      // tests/helpers/bun-test-shim.ts header for the full rationale.
      'tests/engine/eval-cli.test.ts',
      'tests/engine/tools-cli.test.ts',
    ],
    setupFiles: ['tests/helpers/vitest-setup.ts'],
    // Engine suite includes canvas/codec/fig round-trips; bun defaulted these
    // files to 30–60s via setDefaultTimeout (shimmed to a no-op). Pure-JS
    // codec work is markedly slower under Node than under Bun's JIT, so keep
    // the 60s ceiling the bun config used for fig-roundtrip.
    testTimeout: 60_000,
  },
})
