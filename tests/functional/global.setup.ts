import { chromium, firefox, webkit } from '@playwright/test';
import { environment } from './config/environments';
import { browser as target } from './config/browsers';
import { login } from './auth/auth.flow';
import { saveSignedInState, waitForAuthentication } from './auth/auth.actions';

// Log in on the same engine the run is testing — CI only installs the one browser
// QA_BROWSER selects, so a hard-coded chromium.launch() throws "Executable doesn't
// exist" on a firefox/webkit/edge dispatch. `edge` is Chromium driving the msedge
// channel; everything else maps straight to its launcher.
const launchers = { chromium, firefox, webkit, edge: chromium } as const;

export default async function globalSetup() {
  const browser = await launchers[target.name as keyof typeof launchers].launch({
    channel: (target.use as { channel?: string })?.channel,
  });
  const context = await browser.newContext({
    ...target.use,
    baseURL: environment.baseUrl,
  });
  const page = await context.newPage();

  try {
    const authenticated = waitForAuthentication(page);
    await login(page);
    await authenticated;
    await saveSignedInState(context, 'auth.json');
  } finally {
    await context.close();
    await browser.close();
  }
}
