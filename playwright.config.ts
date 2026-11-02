import { defineConfig } from '@playwright/test'

/**
 * End-to-end tests against a running backend with the development profile (demo catalog, fake payment provider,
 * SMS codes in the log): `npm run e2e`.
 * - API_TARGET: the backend (default http://localhost:8080), passed to the dev server's proxy.
 * - E2E_APP_LOG: the backend's log file; the sign-in test reads the "[DEV SMS - not sent]" code from it (skipped
 *   without it).
 * - PW_CHANNEL=chrome: use the installed Chrome instead of Playwright's Chromium.
 * Each run places real orders in that database; use a development database only.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    channel: process.env.PW_CHANNEL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    env: { API_TARGET: process.env.API_TARGET ?? 'http://localhost:8080' },
  },
})
