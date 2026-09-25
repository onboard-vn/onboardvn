import { defineConfig, devices } from '@playwright/test';

const API_PORT = 8787;
const WEB_PORT = 3100;
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://onboard:onboard@localhost:54329/onboard';

const commonEnv = {
  DATABASE_URL,
  BETTER_AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-1234',
  BETTER_AUTH_URL: `http://localhost:${WEB_PORT}`,
  WEB_ORIGIN: `http://localhost:${WEB_PORT}`,
};

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npx tsx src/server.ts',
      cwd: '../api',
      port: API_PORT,
      reuseExistingServer: false,
      // Several e2e specs sign in multiple accounts back-to-back and share one IP-keyed
      // 60s/5-request bucket; disable only Better Auth's own rate limiter, not NODE_ENV.
      env: { ...commonEnv, PORT: String(API_PORT), AUTH_RATE_LIMIT_DISABLED: 'true' },
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `npx next dev --port ${WEB_PORT}`,
      cwd: '.',
      port: WEB_PORT,
      reuseExistingServer: false,
      env: { ...commonEnv, API_INTERNAL_URL: `http://localhost:${API_PORT}` },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
