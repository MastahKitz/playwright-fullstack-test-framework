import { test } from '@playwright/test';
import { submitSignupForm } from './signup.flow';
import { logout } from '../auth.flow';
import { assertPasswordRequiredError } from '../auth.assertions';
import {
  assertEmailRequiredError,
  assertPhoneRequiredError,
  assertConfirmPasswordRequiredError,
  assertPasswordMismatchError,
  assertInvalidEmailFormatError,
  assertInvalidPhoneFormatError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup.assertions';
import { sampleSignupFormData } from './signup.data';

test.describe('signup - errors', { tag: ['@signup', '@mutating'] }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user cannot register with a blank email', async ({ page }) => {
    await submitSignupForm(page, { ...sampleSignupFormData(), email: '' });
    await assertEmailRequiredError(page);
  });

  test('validate user cannot register with a blank phone number', async ({ page }) => {
    await submitSignupForm(page, { ...sampleSignupFormData(), phone: '' });
    await assertPhoneRequiredError(page);
  });

  test('validate user cannot register with a blank password', async ({ page }) => {
    await submitSignupForm(page, { ...sampleSignupFormData(), password: '', confirmPassword: '' });
    await assertPasswordRequiredError(page);
  });

  test('validate user cannot register with a blank confirm password', async ({ page }) => {
    await submitSignupForm(page, { ...sampleSignupFormData(), confirmPassword: '' });
    await assertConfirmPasswordRequiredError(page);
  });

  test('validate user cannot register with mismatched passwords', async ({ page }) => {
    await submitSignupForm(page, { ...sampleSignupFormData(), confirmPassword: 'DifferentPass1' });
    await assertPasswordMismatchError(page);
  });

  test('validate user cannot register with an invalid email format', async ({ page }) => {
    await submitSignupForm(page, { ...sampleSignupFormData(), email: 'not-an-email' });
    await assertInvalidEmailFormatError(page);
  });

  test('validate user cannot register with an invalid phone number format', async ({ page }) => {
    await submitSignupForm(page, { ...sampleSignupFormData(), phone: 'abc123' });
    await assertInvalidPhoneFormatError(page);
  });

  test('validate user cannot register with an email already in use', async ({ page }) => {
    const signupFormData = sampleSignupFormData();
    await submitSignupForm(page, signupFormData);
    await logout(page);

    await submitSignupForm(page, { ...sampleSignupFormData(), email: signupFormData.email });
    await assertDuplicateEmailError(page);
  });

  test('validate user cannot register with a username already in use', async ({ page }) => {
    const username = `sample-qa-signup-dup-${Date.now()}`;
    await submitSignupForm(page, { ...sampleSignupFormData(), username });
    await logout(page);

    await submitSignupForm(page, { ...sampleSignupFormData(), username });
    await assertDuplicateUsernameError(page);
  });
});
