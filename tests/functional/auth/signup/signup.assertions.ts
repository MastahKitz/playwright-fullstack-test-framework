import { Page, expect } from '@playwright/test';
import { assertLoggedIn } from '../auth.assertions';

export async function assertRegistrationSuccess(page: Page, username: string) {
  await assertLoggedIn(page, username);
}

export function assertUsernameWasGenerated(username: string) {
  expect.soft(username, 'a username should have been auto-generated').toBeTruthy();
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

export async function assertInvalidEmailFormatError(page: Page) {
  await expect.soft(page.getByText('Please enter a valid email address', { exact: true })).toBeVisible();
}

export async function assertInvalidPhoneFormatError(page: Page) {
  await expect.soft(page.getByText('Please enter a valid phone number', { exact: true })).toBeVisible();
}

export async function assertPasswordRequiresUppercaseError(page: Page) {
  await expect.soft(page.getByText('Password must contain at least one uppercase letter', { exact: true })).toBeVisible();
}

export async function assertPasswordsDoNotMatchError(page: Page) {
  await expect.soft(page.getByText('Passwords do not match', { exact: true })).toBeVisible();
}

export async function assertDuplicateEmailError(page: Page) {
  await expect.soft(page.getByText('An account with this email address already exists. Please sign in instead.', { exact: true })).toBeVisible();
}

export async function assertDuplicateUsernameError(page: Page) {
  await expect.soft(page.getByText('This username is already taken. Please choose another username.', { exact: true })).toBeVisible();
}
