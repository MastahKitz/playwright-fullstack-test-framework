import { Page, expect } from '@playwright/test';
import { credentials } from './auth.data';

export async function assertLoggedIn(page: Page, username: string = credentials.standardUser.username) {
  await expect.soft(page.getByTestId('navbar-username')).toHaveText(username);
  await expect.soft(page.getByTestId('navbar-logout-button')).toBeVisible();
  await expect.soft(page.getByTestId('navbar-signin-link')).not.toBeVisible();
}

export async function assertLoggedOut(page: Page) {
  await expect.soft(page.getByTestId('navbar-signin-link')).toBeVisible();
  await expect.soft(page.getByTestId('navbar-username')).not.toBeVisible();
  await expect.soft(page.getByTestId('navbar-logout-button')).not.toBeVisible();
}

export async function assertInvalidLoginError(page: Page) {
  await expect.soft(page.getByText('Invalid username or password', { exact: true })).toBeVisible();
}

export async function assertUsernameRequiredError(page: Page) {
  await expect.soft(page.getByText('Username is required', { exact: true })).toBeVisible();
}

export async function assertPasswordRequiredError(page: Page) {
  await expect.soft(page.getByText('Password is required', { exact: true })).toBeVisible();
}

export async function assertAccountLockedError(page: Page) {
  await expect.soft(page.getByText('Account is locked', { exact: true })).toBeVisible();
}

export async function assertAdminMenuAvailable(page: Page) {
  await expect.soft(page.getByTestId('navbar-admin-link')).toBeVisible();
}

export async function assertAdminMenuNotAvailable(page: Page) {
  await expect.soft(page.getByTestId('navbar-admin-link')).not.toBeVisible();
}
