import { test } from '@playwright/test';
import { signup, signupWithGeneratedUsername } from './signup.flow';
import { sampleSignupFormData } from './signup.data';
import { assertLoggedIn } from './auth.assertions';
import { assertUsernameWasGenerated } from './signup.assertions';

test.describe('signup', { tag: '@auth' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user can register with valid information and is automatically logged in', async ({ page }) => {
    const formData = sampleSignupFormData();
    await signup(page, formData);
    await assertLoggedIn(page, formData.username!);
  });

  test('validate user can register without providing a username', async ({ page }) => {
    const { username, ...formData } = sampleSignupFormData();
    const generatedUsername = await signupWithGeneratedUsername(page, formData);
    assertUsernameWasGenerated(generatedUsername);
    await assertLoggedIn(page, generatedUsername);
  });
});
