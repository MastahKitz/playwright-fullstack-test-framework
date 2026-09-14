import { test } from '@playwright/test';
import { signup } from './signup.flow';
import { logout } from './auth.flow';
import { sampleSignupFormData } from './signup.data';
import {
  assertEmailRequiredError,
  assertPhoneRequiredError,
  assertSignupPasswordRequiredError,
  assertConfirmPasswordRequiredError,
  assertInvalidEmailFormatError,
  assertPhoneTooShortError,
  assertSignupPasswordTooShortError,
  assertPasswordMismatchError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup.assertions';

test.describe('signup - errors', { tag: '@auth' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user cannot register with a blank email', async ({ page }) => {
    await signup(page, { ...sampleSignupFormData(), email: '' });
    await assertEmailRequiredError(page);
  });

  test('validate user cannot register with a blank phone number', async ({ page }) => {
    await signup(page, { ...sampleSignupFormData(), phone: '' });
    await assertPhoneRequiredError(page);
  });

  test('validate user cannot register with a blank password', async ({ page }) => {
    await signup(page, { ...sampleSignupFormData(), password: '', confirmPassword: '' });
    await assertSignupPasswordRequiredError(page);
  });

  test('validate user cannot register with a blank confirm password', async ({ page }) => {
    await signup(page, { ...sampleSignupFormData(), confirmPassword: '' });
    await assertConfirmPasswordRequiredError(page);
  });

  test('validate user cannot register with an invalid email format', async ({ page }) => {
    await signup(page, { ...sampleSignupFormData(), email: 'not-an-email' });
    await assertInvalidEmailFormatError(page);
  });

  test('validate user cannot register with a phone number that is too short', async ({ page }) => {
    await signup(page, { ...sampleSignupFormData(), phone: '123' });
    await assertPhoneTooShortError(page);
  });

  test('validate user cannot register with a password shorter than 8 characters', async ({ page }) => {
    await signup(page, { ...sampleSignupFormData(), password: 'Ab1cd2!', confirmPassword: 'Ab1cd2!' });
    await assertSignupPasswordTooShortError(page);
  });

  test('validate user cannot register when password and confirm password do not match', async ({ page }) => {
    const formData = sampleSignupFormData();
    await signup(page, { ...formData, confirmPassword: `Different${formData.password}` });
    await assertPasswordMismatchError(page);
  });

  test('validate user cannot register with an email that is already registered', async ({ page }) => {
    const existingAccount = sampleSignupFormData();
    await signup(page, existingAccount);
    await logout(page);

    await signup(page, { ...sampleSignupFormData(), email: existingAccount.email });
    await assertDuplicateEmailError(page);
  });

  test('validate user cannot register with a username that is already taken', async ({ page }) => {
    const existingAccount = sampleSignupFormData();
    await signup(page, existingAccount);
    await logout(page);

    await signup(page, { ...sampleSignupFormData(), username: existingAccount.username });
    await assertDuplicateUsernameError(page);
  });
});
