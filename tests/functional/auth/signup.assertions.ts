import { Page, expect } from '@playwright/test';

export function assertUsernameWasGenerated(username: string) {
  expect.soft(username.length).toBeGreaterThan(0);
}

export async function assertEmailRequiredError(page: Page) {
  await expect.soft(page.getByText('Email address is required', { exact: true })).toBeVisible();
}

export async function assertPhoneRequiredError(page: Page) {
  await expect.soft(page.getByText('Phone number is required', { exact: true })).toBeVisible();
}

export async function assertSignupPasswordRequiredError(page: Page) {
  await expect.soft(page.getByText('Password is required', { exact: true })).toBeVisible();
}

export async function assertConfirmPasswordRequiredError(page: Page) {
  await expect.soft(page.getByText('Please confirm your password', { exact: true })).toBeVisible();
}

export async function assertInvalidEmailFormatError(page: Page) {
  await expect.soft(page.getByText('Please enter a valid email address', { exact: true })).toBeVisible();
}

export async function assertPhoneTooShortError(page: Page) {
  await expect.soft(page.getByText('Phone number must be at least 7 digits', { exact: true })).toBeVisible();
}

export async function assertSignupPasswordTooShortError(page: Page) {
  await expect.soft(page.getByText('Password must be at least 8 characters', { exact: true })).toBeVisible();
}

export async function assertPasswordMismatchError(page: Page) {
  await expect.soft(page.getByText('Passwords do not match', { exact: true })).toBeVisible();
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
