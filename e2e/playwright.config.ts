import { defineConfig } from '@playwright/test';

const API_PORT = Number(process.env.E2E_API_PORT ?? 8788);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4173);

export default defineConfig({
  testDir: './tests',
  // Sessions end on real time (the Durable Object alarm), so flows are slow and share one worker.
  timeout: 150_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'bash e2e/scripts/start-worker.sh',
      cwd: '..',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Serves the built SPA; `vite preview` reuses the dev proxy for /api (REST and WebSocket).
      command: `pnpm --filter @bsbox/web exec vite preview --port ${WEB_PORT} --strictPort`,
      cwd: '..',
      env: { BSBOX_API_TARGET: `http://localhost:${API_PORT}` },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
