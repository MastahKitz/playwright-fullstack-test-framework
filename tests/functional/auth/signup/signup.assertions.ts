import { Page, expect } from '@playwright/test';
import { assertLoggedIn } from '../auth.assertions';

export async function assertRegistrationSuccessful(page: Page, username: string) {
  await expect.soft(page).toHaveURL(/\/catalog$/);
  await assertLoggedIn(page, username);
}

// Username isn't known ahead of time when the user leaves it blank (AC3: the system
// generates one) — read whatever the navbar actually shows, confirm it's non-blank,
// then reuse assertLoggedIn to check the rest of the logged-in state against it.
export async function assertRegistrationSuccessfulWithGeneratedUsername(page: Page) {
  await expect.soft(page).toHaveURL(/\/catalog$/);
  const username = (await page.getByTestId('navbar-username').textContent())?.trim() ?? '';
  expect.soft(username).not.toBe('');
  await assertLoggedIn(page, username);
}

export async function assertEmailRequiredError(page: Page) {
  await expect.soft(page.getByText('Email address is required', { exact: true })).toBeVisible();
}

export async function assertPhoneRequiredError(page: Page) {
  await expect.soft(page.getByText('Phone number is required', { exact: true })).toBeVisible();
}

export async function assertInvalidEmailFormatError(page: Page) {
  await expect.soft(page.getByText('Please enter a valid email address', { exact: true })).toBeVisible();
}

export async function assertWeakPasswordError(page: Page) {
  await expect.soft(page.getByText('Password must be at least 8 characters', { exact: true })).toBeVisible();
}

export async function assertPasswordMismatchError(page: Page) {
  await expect.soft(page.getByText('Passwords do not match', { exact: true })).toBeVisible();
}

export async function assertDuplicateEmailError(page: Page) {
  await expect.soft(
    page.getByTestId('signup-error').getByText('An account with this email address already exists. Please sign in instead.', { exact: true }),
  ).toBeVisible();
}

export async function assertDuplicateUsernameError(page: Page) {
  await expect.soft(
    page.getByTestId('signup-error').getByText('This username is already taken. Please choose another username.', { exact: true }),
  ).toBeVisible();
}
