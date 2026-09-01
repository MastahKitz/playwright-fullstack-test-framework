import { test } from '@playwright/test';
import { login, logout } from './auth.flow';
import { credentials } from './auth.data';
import { assertLoggedIn, assertLoggedOut, assertAdminMenuAvailable, assertAdminMenuNotAvailable } from './auth.assertions';

test.describe('auth', { tag: '@auth' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate standard user can login', async ({ page }) => {
    await login(page);
    await assertLoggedIn(page);
    await assertAdminMenuNotAvailable(page);
  });

  test('validate admin user can login', async ({ page }) => {
    await login(page, credentials.adminUser.username, credentials.adminUser.password);
    await assertLoggedIn(page, credentials.adminUser.username);
    await assertAdminMenuAvailable(page);
  });

  test('validate standard user can logout', async ({ page }) => {
    await login(page);
    await logout(page);
    await assertLoggedOut(page);
  });
});
