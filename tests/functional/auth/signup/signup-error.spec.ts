import { test } from '@playwright/test';
import { registerNewAccount, registerNewAccountWhileLoggedIn } from './signup.flow';
import { sampleSignupFormData } from './signup.data';
import { credentials } from '../auth.data';
import { assertPasswordRequiredError } from '../auth.assertions';
import {
  assertEmailRequiredError,
  assertPhoneRequiredError,
  assertConfirmPasswordRequiredError,
  assertInvalidEmailError,
  assertPasswordMismatchError,
  assertWeakPasswordError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup.assertions';

test.describe('signup - errors', { tag: '@signup' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user cannot register with a blank email', async ({ page }) => {
    await registerNewAccount(page, { ...sampleSignupFormData(), email: '' });
    await assertEmailRequiredError(page);
  });

  test('validate user cannot register with a blank phone number', async ({ page }) => {
    await registerNewAccount(page, { ...sampleSignupFormData(), phone: '' });
    await assertPhoneRequiredError(page);
  });

  test('validate user cannot register with a blank password', async ({ page }) => {
    await registerNewAccount(page, { ...sampleSignupFormData(), password: '', confirmPassword: '' });
    await assertPasswordRequiredError(page);
  });

  test('validate user cannot register with a blank confirm password', async ({ page }) => {
    await registerNewAccount(page, { ...sampleSignupFormData(), confirmPassword: '' });
    await assertConfirmPasswordRequiredError(page);
  });

  test('validate user cannot register with an invalid email format', async ({ page }) => {
    await registerNewAccount(page, { ...sampleSignupFormData(), email: 'not-an-email' });
    await assertInvalidEmailError(page);
  });

  test('validate user cannot register with mismatched passwords', async ({ page }) => {
    await registerNewAccount(page, { ...sampleSignupFormData(), confirmPassword: 'Mismatched123!' });
    await assertPasswordMismatchError(page);
  });

  test('validate user cannot register with a weak password', async ({ page }) => {
    await registerNewAccount(page, { ...sampleSignupFormData(), password: 'weakpass', confirmPassword: 'weakpass' });
    await assertWeakPasswordError(page);
  });

  // standardUser already exists, so this needs no arrange step of its own — unlike the
  // duplicate-email case below, which needs a real account created first.
  test('validate user cannot register with a duplicate username', async ({ page }) => {
    await registerNewAccount(page, { ...sampleSignupFormData(), username: credentials.standardUser.username });
    await assertDuplicateUsernameError(page);
  });
});

test.describe('signup - duplicate email', { tag: ['@signup', '@mutating'] }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user cannot register with a duplicate email', async ({ page }) => {
    const existingAccount = sampleSignupFormData();
    await registerNewAccount(page, existingAccount);

    await registerNewAccountWhileLoggedIn(page, { ...sampleSignupFormData(), email: existingAccount.email });
    await assertDuplicateEmailError(page);
  });
});
