import { test } from '@playwright/test';
import { register } from './signup.flow';
import { sampleSignupFormData } from './signup.data';
import { assertRegistrationSuccess, assertUsernameWasGenerated } from './signup.assertions';

test.describe('signup', { tag: '@auth' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user can register with valid information', async ({ page }) => {
    const formData = { ...sampleSignupFormData(), username: `sampleSignupUser${Date.now()}` };

    const user = await register(page, formData);

    await assertRegistrationSuccess(page, user.username);
  });

  test('validate user can register without providing a username', async ({ page }) => {
    const formData = sampleSignupFormData();

    const user = await register(page, formData);

    assertUsernameWasGenerated(user.username);
    await assertRegistrationSuccess(page, user.username);
  });
});
