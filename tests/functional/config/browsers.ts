import { devices, type Project } from '@playwright/test';

const browserProfiles: Record<string, Project['use']> = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
  // Real Microsoft Edge (not just a Chromium UA string) — requires the `msedge`
  // channel, which uses the system-installed Edge or `npx playwright install msedge`.
  edge: { ...devices['Desktop Edge'], channel: 'msedge' },
};

const browserName = process.env.QA_BROWSER || 'chromium';

if (!browserProfiles[browserName]) {
  throw new Error(
    `Unknown QA_BROWSER "${browserName}" — expected one of: ${Object.keys(browserProfiles).join(', ')}`,
  );
}

export const browser = {
  name: browserName,
  use: browserProfiles[browserName],
};
