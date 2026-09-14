import { test } from '@playwright/test';
import { register, attemptRegistration } from './signup.flow';
import { logout } from '../auth.flow';
import { sampleSignupFormData } from './signup.data';
import { assertPasswordRequiredError } from '../auth.assertions';
import {
  assertEmailRequiredError,
  assertPhoneRequiredError,
  assertConfirmPasswordRequiredError,
  assertInvalidEmailFormatError,
  assertInvalidPhoneFormatError,
  assertPasswordRequiresUppercaseError,
  assertPasswordsDoNotMatchError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup.assertions';

test.describe('signup - errors', { tag: '@auth' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user cannot register with a blank email', async ({ page }) => {
    await attemptRegistration(page, { ...sampleSignupFormData(), email: '' });
    await assertEmailRequiredError(page);
  });

  test('validate user cannot register with an invalid email format', async ({ page }) => {
    await attemptRegistration(page, { ...sampleSignupFormData(), email: 'not-an-email' });
    await assertInvalidEmailFormatError(page);
  });

  test('validate user cannot register with a blank phone number', async ({ page }) => {
    await attemptRegistration(page, { ...sampleSignupFormData(), phone: '' });
    await assertPhoneRequiredError(page);
  });

  test('validate user cannot register with an invalid phone number format', async ({ page }) => {
    await attemptRegistration(page, { ...sampleSignupFormData(), phone: 'abcdefgh' });
    await assertInvalidPhoneFormatError(page);
  });

  test('validate user cannot register with a blank password', async ({ page }) => {
    await attemptRegistration(page, { ...sampleSignupFormData(), password: '', confirmPassword: '' });
    await assertPasswordRequiredError(page);
  });

  test('validate user cannot register with a weak password', async ({ page }) => {
    await attemptRegistration(page, { ...sampleSignupFormData(), password: 'weakpassword', confirmPassword: 'weakpassword' });
    await assertPasswordRequiresUppercaseError(page);
  });

  test('validate user cannot register with a blank confirm password', async ({ page }) => {
    await attemptRegistration(page, { ...sampleSignupFormData(), confirmPassword: '' });
    await assertConfirmPasswordRequiredError(page);
  });

  test('validate user cannot register with mismatched password and confirm password', async ({ page }) => {
    await attemptRegistration(page, { ...sampleSignupFormData(), confirmPassword: 'DifferentP@ss1' });
    await assertPasswordsDoNotMatchError(page);
  });

  test('validate user cannot register with an email that is already registered', async ({ page }) => {
    const existingUser = await register(page, sampleSignupFormData());
    await logout(page);

    await attemptRegistration(page, { ...sampleSignupFormData(), email: existingUser.email });

    await assertDuplicateEmailError(page);
  });

  test('validate user cannot register with a username that is already taken', async ({ page }) => {
    const existingUser = await register(page, sampleSignupFormData());
    await logout(page);

    await attemptRegistration(page, { ...sampleSignupFormData(), username: existingUser.username });

    await assertDuplicateUsernameError(page);
  });
});
