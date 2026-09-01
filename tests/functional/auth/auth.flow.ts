import { Page } from '@playwright/test';
import * as authActions from './auth.actions';
import { credentials } from './auth.data';

export async function login(
  page: Page,
  username: string = credentials.standardUser.username,
  password: string = credentials.standardUser.password,
) {
  await authActions.openHomePage(page);
  await authActions.clickSignInLink(page);
  await authActions.enterUsername(page, username);
  await authActions.enterPassword(page, password);
  await authActions.clickSignInButton(page);
}

export async function logout(page: Page) {
  await authActions.clickSignOutButton(page);
}
