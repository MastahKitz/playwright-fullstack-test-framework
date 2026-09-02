import { test } from '@playwright/test';
import { sendLoginRequest } from './auth-api.actions';
import { standardUserLoginBody, adminUserLoginBody } from './auth-api.data';
import { assertLoginSuccess } from './auth-api.assertions';
import { credentials } from './auth.data';

test.describe('auth api', { tag: '@auth' }, () => {

  test('validate standard user can login', async ({ request }) => {
    const response = await sendLoginRequest(request, standardUserLoginBody);
    await assertLoginSuccess(response, { id: 1, username: credentials.standardUser.username, userType: 'standard' });
  });

  test('validate admin user can login', async ({ request }) => {
    const response = await sendLoginRequest(request, adminUserLoginBody);
    await assertLoginSuccess(response, { id: 3, username: credentials.adminUser.username, userType: 'admin' });
  });

});
