import { test } from '@playwright/test';
import { register } from './signup.flow';
import { sampleSignupFormData, sampleUsername } from './signup.data';
import { assertRegistrationSuccessful, assertRegistrationSuccessfulWithGeneratedUsername } from './signup.assertions';

test.describe('signup', { tag: '@signup' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user can register with a username', async ({ page }) => {
    const username = sampleUsername();
    const form = { ...sampleSignupFormData(), username };

    await register(page, form);
    await assertRegistrationSuccessful(page, username);
  });

  test('validate user can register without a username', async ({ page }) => {
    const form = sampleSignupFormData();

    await register(page, form);
    await assertRegistrationSuccessfulWithGeneratedUsername(page);
  });
});
