import { Page } from '@playwright/test';

export async function clickSignUpLink(page: Page) {
  await page.getByTestId('navbar-signup-link').click();
  await page.waitForLoadState('networkidle');
}

export async function enterEmail(page: Page, email: string) {
  await page.getByTestId('email-input').fill(email);
}

export async function enterPhone(page: Page, phone: string) {
  await page.getByTestId('phone-input').fill(phone);
}

export async function enterSignupUsername(page: Page, username: string) {
  await page.getByTestId('username-input').fill(username);
}

export async function enterSignupPassword(page: Page, password: string) {
  await page.getByTestId('password-input').fill(password);
}

export async function enterConfirmPassword(page: Page, confirmPassword: string) {
  await page.getByTestId('confirm-password-input').fill(confirmPassword);
}

export async function clickCreateAccountButton(page: Page) {
  await page.getByTestId('signup-submit-button').click();
  await page.waitForLoadState('networkidle');
}
