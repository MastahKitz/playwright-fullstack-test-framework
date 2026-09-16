import { test } from '@playwright/test';
import { registerNewAccount } from './signup.flow';
import { sampleSignupFormData } from './signup.data';
import { assertLoggedIn } from '../auth.assertions';
import { assertRegisteredWithGeneratedUsername } from './signup.assertions';

test.describe('signup', { tag: ['@signup', '@mutating'] }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user can register a new account with a username', async ({ page }) => {
    const formData = sampleSignupFormData();

    await registerNewAccount(page, formData);
    await assertLoggedIn(page, formData.username!);
  });

  test('validate user can register a new account without a username', async ({ page }) => {
    const formData = { ...sampleSignupFormData(), username: undefined };

    await registerNewAccount(page, formData);
    await assertRegisteredWithGeneratedUsername(page);
  });
});
