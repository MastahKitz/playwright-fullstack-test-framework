import { test } from '@playwright/test';
import { signUp } from './signup.flow';
import { sampleSignupFormData } from './signup.data';
import { assertLoggedIn } from '../auth.assertions';
import { assertAccountCreatedWithGeneratedUsername } from './signup.assertions';

test.describe('signup', { tag: ['@signup', '@mutating'] }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user can create an account with valid registration information', async ({ page }) => {
    const username = `sampleSignup${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    await signUp(page, { ...sampleSignupFormData(), username });
    await assertLoggedIn(page, username);
  });

  test('validate user can create an account without providing a username', async ({ page }) => {
    await signUp(page, sampleSignupFormData());
    await assertAccountCreatedWithGeneratedUsername(page);
  });
});
