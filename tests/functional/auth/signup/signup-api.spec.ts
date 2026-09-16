import { test, expect } from '@playwright/test';
import { sendSignupRequest } from './signup-api.actions';
import { sampleSignupRequestBody, sampleUsername } from './signup-api.data';
import { assertSignupSuccess, assertSignupSuccessWithGeneratedUsername } from './signup-api.assertions';

test.describe('signup api', { tag: ['@signup', '@api'] }, () => {

  test('validate user can register with a username', async ({ request }) => {
    const username = sampleUsername();
    const body = { ...sampleSignupRequestBody(), username };

    const response = await sendSignupRequest(request, body);
    await assertSignupSuccess(response, {
      id: expect.any(Number),
      username,
      userType: 'standard',
      email: body.email,
      phone: body.phone,
    });
  });

  test('validate user can register without a username', async ({ request }) => {
    const body = sampleSignupRequestBody();

    const response = await sendSignupRequest(request, body);
    await assertSignupSuccessWithGeneratedUsername(response, body.email, body.phone);
  });

});
