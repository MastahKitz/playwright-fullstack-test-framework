import { test } from '@playwright/test';
import { register } from './signup.flow';
import { sampleSignupFormData } from './signup.data';
import { assertRegisteredAndLoggedIn } from './signup.assertions';

test.describe('signup', { tag: '@auth' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user can register with valid information and is automatically logged in', async ({ page }) => {
    const form = sampleSignupFormData();
    await register(page, form);
    await assertRegisteredAndLoggedIn(page);
  });

  test('validate user can register with a custom username', async ({ page }) => {
    const form = { ...sampleSignupFormData(), username: `qasignup${Date.now()}` };
    await register(page, form);
    await assertRegisteredAndLoggedIn(page, form.username);
  });
});
