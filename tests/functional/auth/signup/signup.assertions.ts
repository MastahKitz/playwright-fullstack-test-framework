import { Page, expect } from '@playwright/test';
import { assertLoggedIn } from '../auth.assertions';

// The username field is optional; when omitted the server auto-generates one, so the
// exact value can't be asserted — only that a non-empty username is shown and the new
// account is logged in.
export async function assertRegisteredWithGeneratedUsername(page: Page) {
  await assertLoggedIn(page, /^\S+$/);
}

export async function assertEmailRequiredError(page: Page) {
  await expect.soft(page.getByText('Email address is required', { exact: true })).toBeVisible();
}

export async function assertPhoneRequiredError(page: Page) {
  await expect.soft(page.getByText('Phone number is required', { exact: true })).toBeVisible();
}

export async function assertConfirmPasswordRequiredError(page: Page) {
  await expect.soft(page.getByText('Please confirm your password', { exact: true })).toBeVisible();
}

export async function assertInvalidEmailError(page: Page) {
  await expect.soft(page.getByText('Please enter a valid email address', { exact: true })).toBeVisible();
}

export async function assertPasswordMismatchError(page: Page) {
  await expect.soft(page.getByText('Passwords do not match', { exact: true })).toBeVisible();
}

export async function assertWeakPasswordError(page: Page) {
  await expect.soft(page.getByText('Password must contain at least one uppercase letter', { exact: true })).toBeVisible();
}

export async function assertDuplicateEmailError(page: Page) {
  await expect.soft(page.getByTestId('signup-error')).toHaveText('An account with this email address already exists. Please sign in instead.');
}

export async function assertDuplicateUsernameError(page: Page) {
  await expect.soft(page.getByTestId('signup-error')).toHaveText('This username is already taken. Please choose another username.');
}
