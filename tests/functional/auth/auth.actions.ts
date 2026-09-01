import { Page } from '@playwright/test';

export async function openHomePage(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

export async function clickSignInLink(page: Page) {
  await page.getByTestId('navbar-signin-link').click();
  await page.waitForLoadState('networkidle');
}

export async function enterUsername(page: Page, username: string) {
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
}

export async function enterPassword(page: Page, password: string) {
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
}

export async function clickSignInButton(page: Page) {
  await page.getByTestId('login-submit-button').click();
  await page.waitForLoadState('networkidle');
}

export function waitForAuthentication(page: Page) {
  return page.waitForResponse(
    (res) =>
      new URL(res.url()).pathname === '/api/auth/login' &&
      res.request().method() === 'POST' &&
      res.ok(),
  );
}

export async function clickSignOutButton(page: Page) {
  await page.getByTestId('navbar-logout-button').click();
  await page.waitForLoadState('networkidle');
}
