import { defineConfig } from '@playwright/test'

/**
 * End-to-end tests against a running backend with the development profile (demo catalog and fake payment provider): `npm run e2e`.
 * - API_TARGET: the backend (default http://localhost:8080), passed to the dev server's proxy.
 * - E2E_MAILBOX: capture file produced by e2e/smtp_sink.py for shopper account tests.
 * - PW_CHANNEL=chrome or PW_EXECUTABLE=/path/to/chromium: use a system browser.
 * - The online-payment test follows the fake provider back to the backend's PAYMENT_RETURN_URL (default
 *   http://localhost:5173/checkout/result), so keep `npm run dev` running on 5173 too, or point that URL at 5174.
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
    launchOptions: { executablePath: process.env.PW_EXECUTABLE },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    env: { API_TARGET: process.env.API_TARGET ?? 'http://localhost:8080' },
  },
})
