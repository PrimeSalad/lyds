import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright/e2e',
  fullyParallel: true,
  // Keep browser startup reliable on modest local and CI runners.
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the dev server automatically if none is already running.
  // In CI: always starts a fresh server.
  // In local dev: reuses an existing server on port 5173 if one is already running.
  webServer: {
    command: 'npm run dev -- --host localhost --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      VITE_APP_NAME: 'SK Youth Information Management System',
      VITE_API_BASE_URL: 'http://localhost:4000/api/v1',
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'playwright-public-key',
    },
  },
});
