import { chromium, devices } from '@playwright/test';
import { environment } from './config/environments';
import { login } from './auth/auth.flow';

export default async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    baseURL: environment.baseUrl,
  });
  const page = await context.newPage();

  try {
    await login(page);
    await context.storageState({ path: 'auth.json' });
  } finally {
    await context.close();
    await browser.close();
  }
}
