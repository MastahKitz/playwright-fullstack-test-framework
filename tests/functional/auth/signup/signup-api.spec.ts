import { test } from '@playwright/test';
import { sendSignupRequest } from './signup-api.actions';
import { assertSignupSuccess } from './signup-api.assertions';
import { sampleSignupFormData } from './signup.data';

test.describe('signup api', { tag: ['@signup', '@api', '@mutating'] }, () => {

  test('validate user can register a new account', async ({ request }) => {
    const username = `sample-qa-signup-api-${Date.now()}`;
    const signupRequestBody = { ...sampleSignupFormData(), username };

    const response = await sendSignupRequest(request, signupRequestBody);

    await assertSignupSuccess(response, { username, email: signupRequestBody.email, phone: signupRequestBody.phone });
  });

  test('validate user can register without providing a username', async ({ request }) => {
    const signupRequestBody = sampleSignupFormData();

    const response = await sendSignupRequest(request, signupRequestBody);

    await assertSignupSuccess(response, { email: signupRequestBody.email, phone: signupRequestBody.phone });
  });

});
