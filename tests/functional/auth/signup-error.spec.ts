import { test } from '@playwright/test';
import { register } from './signup.flow';
import { sampleSignupFormData, SignupFormData } from './signup.data';
import {
  assertEmailRequiredError,
  assertPhoneRequiredError,
  assertPasswordRequiredError,
  assertConfirmPasswordRequiredError,
  assertInvalidEmailError,
  assertWeakPasswordError,
  assertPasswordMismatchError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup.assertions';

test.describe('signup - errors', { tag: '@auth' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let existingUser: SignupFormData;

  test.beforeAll(async ({ browser }) => {
    existingUser = { ...sampleSignupFormData(), username: `qasignupdup${Date.now()}` };
    const setupPage = await browser.newPage();
    await register(setupPage, existingUser);
    await setupPage.close();
  });

  test('validate user cannot register with a blank email', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), email: '' });
    await assertEmailRequiredError(page);
  });

  test('validate user cannot register with a blank phone number', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), phone: '' });
    await assertPhoneRequiredError(page);
  });

  test('validate user cannot register with a blank password', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), password: '' });
    await assertPasswordRequiredError(page);
  });

  test('validate user cannot register without confirming the password', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), confirmPassword: '' });
    await assertConfirmPasswordRequiredError(page);
  });

  test('validate user cannot register with an invalid email address', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), email: 'not-an-email' });
    await assertInvalidEmailError(page);
  });

  test('validate user cannot register with a weak password', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), password: 'weak', confirmPassword: 'weak' });
    await assertWeakPasswordError(page);
  });

  test('validate user cannot register with mismatched password and confirm password', async ({ page }) => {
    const form = sampleSignupFormData();
    await register(page, { ...form, confirmPassword: `${form.confirmPassword}-different` });
    await assertPasswordMismatchError(page);
  });

  test('validate user cannot register with a duplicate email address', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), email: existingUser.email });
    await assertDuplicateEmailError(page);
  });

  test('validate user cannot register with a duplicate username', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), username: existingUser.username });
    await assertDuplicateUsernameError(page);
  });
});
