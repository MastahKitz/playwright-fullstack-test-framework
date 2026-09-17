import { test } from '@playwright/test';
import { signUp } from './signup.flow';
import { sampleSignupFormData, SignupFormData } from './signup.data';
import {
  assertEmailRequiredError,
  assertPhoneRequiredError,
  assertSignupPasswordRequiredError,
  assertConfirmPasswordRequiredError,
  assertInvalidEmailFormatError,
  assertPhoneTooShortError,
  assertWeakPasswordError,
  assertPasswordMismatchError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup.assertions';

test.describe('signup - errors', { tag: ['@signup', '@mutating'] }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // arranged once and only ever read (duplicate-checked) by the tests below, so
  // no inter-test ordering dependency requiring serial mode
  let existingAccount: SignupFormData;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ storageState: { cookies: [], origins: [] } });
    existingAccount = { ...sampleSignupFormData(), username: `sampleSignupDup${Date.now()}${Math.random().toString(36).slice(2, 6)}` };
    await signUp(page, existingAccount);
    await page.close();
  });

  test('validate user cannot register with required fields left blank', async ({ page }) => {
    await signUp(page, { email: '', phone: '', password: '', confirmPassword: '' });
    await assertEmailRequiredError(page);
    await assertPhoneRequiredError(page);
    await assertSignupPasswordRequiredError(page);
    await assertConfirmPasswordRequiredError(page);
  });

  test('validate user cannot register with an invalid email format', async ({ page }) => {
    await signUp(page, { ...sampleSignupFormData(), email: 'notanemail' });
    await assertInvalidEmailFormatError(page);
  });

  test('validate user cannot register with a phone number that is too short', async ({ page }) => {
    await signUp(page, { ...sampleSignupFormData(), phone: '123' });
    await assertPhoneTooShortError(page);
  });

  test('validate user cannot register with a password that does not meet complexity requirements', async ({ page }) => {
    await signUp(page, { ...sampleSignupFormData(), password: 'weak', confirmPassword: 'weak' });
    await assertWeakPasswordError(page);
  });

  test('validate user cannot register when passwords do not match', async ({ page }) => {
    await signUp(page, { ...sampleSignupFormData(), confirmPassword: 'Different123!' });
    await assertPasswordMismatchError(page);
  });

  test('validate user cannot register with a duplicate email address', async ({ page }) => {
    await signUp(page, { ...sampleSignupFormData(), email: existingAccount.email });
    await assertDuplicateEmailError(page);
  });

  test('validate user cannot register with a duplicate username', async ({ page }) => {
    await signUp(page, { ...sampleSignupFormData(), username: existingAccount.username });
    await assertDuplicateUsernameError(page);
  });
});
