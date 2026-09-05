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
  workers: 5,
  globalSetup: './tests/functional/global.setup.ts',
  // PW_PHASE is set by each phase invocation in CI (see playwright.yml) so every
  // phase writes its own named blob file instead of clobbering a shared one;
  // those blobs are merged back into the usual html/list/json report afterward.
  // Unset (plain local `npm test`) keeps the normal reporters.
  reporter: process.env.PW_PHASE
    ? [['blob', { outputDir: 'blob-report', fileName: `${process.env.PW_PHASE}.zip` }]]
    : [
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
      name: 'chromium-mutating',
      grep: /@mutating/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      grepInvert: /@mutating/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
