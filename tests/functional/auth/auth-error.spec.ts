import { test } from '@playwright/test';
import { login } from './auth.flow';
import { credentials } from './auth.data';
import { assertInvalidLoginError, assertUsernameRequiredError, assertPasswordRequiredError, assertAccountLockedError } from './auth.assertions';

test.describe('auth - errors', { tag: '@auth' }, () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('validate user cannot login with invalid credentials', async ({ page }) => {
    await login(page, credentials.standardUser.username, 'WrongPassword123');
    await assertInvalidLoginError(page);
  });

  test('validate user cannot login with blank username', async ({ page }) => {
    await login(page, '', 'password123');
    await assertUsernameRequiredError(page);
  });

  test('validate user cannot login with blank password', async ({ page }) => {
    await login(page, credentials.standardUser.username, '');
    await assertPasswordRequiredError(page);
  });

  test('validate locked user cannot login', async ({ page }) => {
    await login(page, credentials.lockedUser.username, credentials.lockedUser.password);
    await assertAccountLockedError(page);
  });
});
