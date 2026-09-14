import { test } from '@playwright/test';
import { submitSignupForm } from './signup.flow';
import { assertSignupSuccess } from './signup.assertions';
import { sampleSignupFormData } from './signup.data';

test.describe('signup', { tag: ['@signup', '@mutating'] }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user can register a new account', async ({ page }) => {
    const signupFormData = { ...sampleSignupFormData(), username: `sample-qa-signup-user-${Date.now()}` };

    await submitSignupForm(page, signupFormData);

    await assertSignupSuccess(page, signupFormData.username);
  });

  test('validate user can register without providing a username', async ({ page }) => {
    const signupFormData = sampleSignupFormData();

    await submitSignupForm(page, signupFormData);

    await assertSignupSuccess(page);
  });
});
