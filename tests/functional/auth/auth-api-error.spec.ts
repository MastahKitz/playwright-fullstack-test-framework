import { test } from '@playwright/test';
import { sendLoginRequest } from './auth-api.actions';
import { standardUserLoginBody, lockedUserLoginBody } from './auth-api.data';
import {
  assertInvalidCredentialsError,
  assertUsernameRequiredError,
  assertPasswordRequiredError,
  assertAccountLockedError,
} from './auth-api.assertions';

test.describe('auth api - errors', { tag: ['@auth', '@api'] }, () => {

  test('validate user cannot login with invalid credentials', async ({ request }) => {
    const response = await sendLoginRequest(request, { ...standardUserLoginBody, password: 'WrongPassword123' });
    await assertInvalidCredentialsError(response);
  });

  test('validate user cannot login with blank username', async ({ request }) => {
    const response = await sendLoginRequest(request, { ...standardUserLoginBody, username: '' });
    await assertUsernameRequiredError(response);
  });

  test('validate user cannot login with blank password', async ({ request }) => {
    const response = await sendLoginRequest(request, { ...standardUserLoginBody, password: '' });
    await assertPasswordRequiredError(response);
  });

  test('validate locked user cannot login', async ({ request }) => {
    const response = await sendLoginRequest(request, lockedUserLoginBody);
    await assertAccountLockedError(response);
  });

});
