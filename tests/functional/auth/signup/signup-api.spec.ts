import { test } from '@playwright/test';
import { sendSignupRequest } from './signup-api.actions';
import { sampleSignupRequestBody } from './signup-api.data';
import { assertSignupSuccess } from './signup-api.assertions';

test.describe('signup api', { tag: ['@signup', '@api', '@mutating'] }, () => {

  test('validate user can register a new account with a username', async ({ request }) => {
    const body = sampleSignupRequestBody();

    const response = await sendSignupRequest(request, body);
    await assertSignupSuccess(response, { email: body.email, phone: body.phone, username: body.username });
  });

  test('validate user can register a new account without a username', async ({ request }) => {
    const body = { ...sampleSignupRequestBody(), username: undefined };

    const response = await sendSignupRequest(request, body);
    await assertSignupSuccess(response, { email: body.email, phone: body.phone });
  });

});
