import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// In development the API is reached through this proxy, so the browser sees one origin. The proxy drops the
// Origin header because the backend only allows its configured CORS origins; that keeps any dev port working.
// API_TARGET points the proxy elsewhere when 8080 is taken (e.g. API_TARGET=http://localhost:8081 npm run dev).
const apiTarget = process.env.API_TARGET ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'))
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Playwright's end-to-end tests live in e2e/ and run with `npm run e2e`.
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
