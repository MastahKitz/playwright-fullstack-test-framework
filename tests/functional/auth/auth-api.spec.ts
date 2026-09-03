import { test } from '@playwright/test';
import { sendLoginRequest, sendLogoutRequest } from './auth-api.actions';
import { generateAccessToken } from './auth-api.flow';
import { standardUserLoginBody, adminUserLoginBody } from './auth-api.data';
import { assertLoginSuccess, assertLogoutSuccess } from './auth-api.assertions';
import { credentials } from './auth.data';

test.describe('auth api', { tag: ['@auth', '@api'] }, () => {

  test('validate standard user can login', async ({ request }) => {
    const response = await sendLoginRequest(request, standardUserLoginBody);
    await assertLoginSuccess(response, { id: 1, username: credentials.standardUser.username, userType: 'standard' });
  });

  test('validate admin user can login', async ({ request }) => {
    const response = await sendLoginRequest(request, adminUserLoginBody);
    await assertLoginSuccess(response, { id: 3, username: credentials.adminUser.username, userType: 'admin' });
  });

  test('validate standard user can logout', async ({ request }) => {
    const accessToken = await generateAccessToken(request, standardUserLoginBody);
    const response = await sendLogoutRequest(request, accessToken);
    await assertLogoutSuccess(response);
  });

});
