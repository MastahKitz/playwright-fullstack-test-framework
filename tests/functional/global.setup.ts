import { chromium, devices } from '@playwright/test';
import { environment } from './config/environments';
import { login } from './auth/auth.flow';
import { saveSignedInState, waitForAuthentication } from './auth/auth.actions';

export default async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
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
