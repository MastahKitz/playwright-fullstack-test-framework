import { test } from '@playwright/test';
import { sendSignupRequest } from './signup-api.actions';
import { registerAccount } from './signup-api.flow';
import { sampleSignupRequestBody } from './signup-api.data';
import { assertSignupSuccess } from './signup-api.assertions';
import { sendLogoutRequest } from '../auth-api.actions';
import { assertLogoutSuccess } from '../auth-api.assertions';

test.describe('signup api', { tag: ['@signup', '@api', '@mutating'] }, () => {

  test('validate user can create an account with valid registration information', async ({ request }) => {
    const signupRequestBody = { ...sampleSignupRequestBody(), username: `sampleSignupApi${Date.now()}${Math.random().toString(36).slice(2, 6)}` };

    const response = await sendSignupRequest(request, signupRequestBody);
    await assertSignupSuccess(response, signupRequestBody);
  });

  test('validate user can create an account without providing a username', async ({ request }) => {
    const signupRequestBody = sampleSignupRequestBody();

    const response = await sendSignupRequest(request, signupRequestBody);
    await assertSignupSuccess(response, signupRequestBody);
  });

  test('validate user is automatically logged in after registration', async ({ request }) => {
    const accessToken = await registerAccount(request, sampleSignupRequestBody());

    const response = await sendLogoutRequest(request, accessToken);
    await assertLogoutSuccess(response);
  });

});
