import { test } from '@playwright/test';
import { sendSignupRequest } from './signup-api.actions';
import { sampleSignupRequestBody } from './signup-api.data';
import { assertSignupSuccess } from './signup-api.assertions';

test.describe('signup api', { tag: ['@auth', '@api'] }, () => {

  test('validate user can register with valid information', async ({ request }) => {
    const requestBody = { ...sampleSignupRequestBody(), username: `sampleSignupApiUser${Date.now()}` };

    const response = await sendSignupRequest(request, requestBody);

    await assertSignupSuccess(response, {
      username: requestBody.username,
      userType: 'standard',
      email: requestBody.email,
      phone: requestBody.phone,
    });
  });

  test('validate user can register without providing a username', async ({ request }) => {
    const requestBody = sampleSignupRequestBody();

    const response = await sendSignupRequest(request, requestBody);

    await assertSignupSuccess(response, {
      userType: 'standard',
      email: requestBody.email,
      phone: requestBody.phone,
    });
  });

});
