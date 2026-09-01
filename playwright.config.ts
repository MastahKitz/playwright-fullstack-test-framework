import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: './tests/functional/config/.env' });

import { environment } from './tests/functional/config/environments';

export default defineConfig({
  testDir: './tests/functional',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 2 : 0,
  globalSetup: './tests/functional/global.setup.ts',
  reporter: [
    ['html', { outputFolder: 'test-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-report/results.json' }],
  ],
  use: {
    baseURL: environment.baseUrl,
    storageState: 'auth.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  outputDir: 'test-results',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
