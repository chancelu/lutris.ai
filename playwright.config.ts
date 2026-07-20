import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  workers: 1,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.3
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.3
    }
  },
  use: {
    baseURL: 'http://localhost:1420',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    launchOptions: {
      args: ['--enable-unsafe-swiftshader']
    }
  },
  projects: [
    {
      name: 'lutris',
      testDir: './tests/e2e',
      fullyParallel: false
    },
    {
      name: 'figma',
      testDir: './tests/figma'
    }
  ],
  webServer: {
    // Self-contained dev server: no bun required. VITE_AI_* are stripped so the
    // app boots in its keyless state (process env wins over .env.local) — the
    // ProviderSetup/no-key e2e paths depend on this.
    command: 'npx vite --port 1420 --strictPort',
    env: {
      VITE_AI_PROVIDER: '',
      VITE_AI_API_KEY: '',
      VITE_AI_BASE_URL: '',
      VITE_AI_MODEL: '',
      VITE_AI_API_TYPE: ''
    },
    port: 1420,
    timeout: 60_000,
    reuseExistingServer: true
  }
})
