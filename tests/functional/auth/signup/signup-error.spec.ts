import { test } from '@playwright/test';
import { register } from './signup.flow';
import { logout } from '../auth.flow';
import { sampleSignupFormData, sampleUsername } from './signup.data';
import { assertPasswordRequiredError } from '../auth.assertions';
import {
  assertEmailRequiredError,
  assertPhoneRequiredError,
  assertInvalidEmailFormatError,
  assertWeakPasswordError,
  assertPasswordMismatchError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup.assertions';

test.describe('signup - errors', { tag: '@signup' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user cannot register with a blank email', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), email: '' });
    await assertEmailRequiredError(page);
  });

  test('validate user cannot register with a blank phone number', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), phone: '' });
    await assertPhoneRequiredError(page);
  });

  test('validate user cannot register with a blank password', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), password: '', confirmPassword: '' });
    await assertPasswordRequiredError(page);
  });

  test('validate user cannot register with an invalid email format', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), email: 'not-an-email' });
    await assertInvalidEmailFormatError(page);
  });

  test('validate user cannot register with a password that does not meet complexity requirements', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), password: 'weak', confirmPassword: 'weak' });
    await assertWeakPasswordError(page);
  });

  test('validate user cannot register with mismatched password confirmation', async ({ page }) => {
    await register(page, { ...sampleSignupFormData(), confirmPassword: 'DifferentPass123!' });
    await assertPasswordMismatchError(page);
  });

  test('validate user cannot register with an email that is already registered', async ({ page }) => {
    const existingAccount = sampleSignupFormData();
    await register(page, existingAccount);
    await logout(page);

    await register(page, { ...sampleSignupFormData(), email: existingAccount.email });
    await assertDuplicateEmailError(page);
  });

  test('validate user cannot register with a username that is already taken', async ({ page }) => {
    const existingAccount = { ...sampleSignupFormData(), username: sampleUsername() };
    await register(page, existingAccount);
    await logout(page);

    await register(page, { ...sampleSignupFormData(), username: existingAccount.username });
    await assertDuplicateUsernameError(page);
  });
});
