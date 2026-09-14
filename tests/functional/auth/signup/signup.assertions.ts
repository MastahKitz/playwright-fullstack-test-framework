import { Page, expect } from '@playwright/test';
import { assertLoggedIn } from '../auth.assertions';

// `expectedUsername` is only known up front when the caller supplied one — when
// username is left blank the server generates it, so we only assert *something*
// non-empty landed in the navbar rather than pin an unspecified generation scheme.
export async function assertSignupSuccess(page: Page, expectedUsername?: string) {
  await expect.soft(page).toHaveURL(/\/catalog$/);
  if (expectedUsername !== undefined) {
    await assertLoggedIn(page, expectedUsername);
  } else {
    await expect.soft(page.getByTestId('navbar-username')).not.toHaveText('');
    await expect.soft(page.getByTestId('navbar-logout-button')).toBeVisible();
    await expect.soft(page.getByTestId('navbar-signin-link')).not.toBeVisible();
  }
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

export async function assertPasswordMismatchError(page: Page) {
  await expect.soft(page.getByText('Passwords do not match', { exact: true })).toBeVisible();
}

export async function assertInvalidEmailFormatError(page: Page) {
  await expect.soft(page.getByText('Please enter a valid email address', { exact: true })).toBeVisible();
}

export async function assertInvalidPhoneFormatError(page: Page) {
  await expect.soft(page.getByText('Phone number must be at least 7 digits', { exact: true })).toBeVisible();
}

export async function assertDuplicateEmailError(page: Page) {
  await expect
    .soft(page.getByTestId('signup-error'))
    .toHaveText('An account with this email address already exists. Please sign in instead.');
}

export async function assertDuplicateUsernameError(page: Page) {
  await expect
    .soft(page.getByTestId('signup-error'))
    .toHaveText('This username is already taken. Please choose another username.');
}
