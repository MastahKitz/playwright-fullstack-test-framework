import { Page, expect } from '@playwright/test';

export async function assertRegisteredAndLoggedIn(page: Page, expectedUsername?: string) {
  await expect.soft(page).toHaveURL(/\/catalog$/);
  await expect.soft(page.getByTestId('navbar-logout-button')).toBeVisible();
  await expect.soft(page.getByTestId('navbar-signin-link')).not.toBeVisible();
  if (expectedUsername) {
    await expect.soft(page.getByTestId('navbar-username')).toHaveText(expectedUsername);
  } else {
    // no username was submitted — the app auto-generates one (exact value is an implementation detail)
    await expect.soft(page.getByTestId('navbar-username')).not.toHaveText('');
  }
}

export async function assertEmailRequiredError(page: Page) {
  await expect.soft(page.getByText('Email address is required', { exact: true })).toBeVisible();
}

export async function assertPhoneRequiredError(page: Page) {
  await expect.soft(page.getByText('Phone number is required', { exact: true })).toBeVisible();
}

export async function assertPasswordRequiredError(page: Page) {
  await expect.soft(page.getByText('Password is required', { exact: true })).toBeVisible();
}

export async function assertConfirmPasswordRequiredError(page: Page) {
  await expect.soft(page.getByText('Please confirm your password', { exact: true })).toBeVisible();
}

export async function assertInvalidEmailError(page: Page) {
  await expect.soft(page.getByText('Please enter a valid email address', { exact: true })).toBeVisible();
}

export async function assertWeakPasswordError(page: Page) {
  await expect.soft(page.getByText('Password must be at least 8 characters', { exact: true })).toBeVisible();
}

export async function assertPasswordMismatchError(page: Page) {
  await expect.soft(page.getByText('Passwords do not match', { exact: true })).toBeVisible();
}

export async function assertDuplicateEmailError(page: Page) {
  await expect.soft(page.getByTestId('signup-error')).toHaveText('An account with this email address already exists. Please sign in instead.');
}

export async function assertDuplicateUsernameError(page: Page) {
  await expect.soft(page.getByTestId('signup-error')).toHaveText('This username is already taken. Please choose another username.');
}
