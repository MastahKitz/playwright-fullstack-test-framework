import { test, expect } from '@playwright/test';
import { sendSignupRequest } from './signup-api.actions';
import { sampleSignupRequestBody } from './signup-api.data';
import { assertSignupSuccess } from './signup-api.assertions';

test.describe('signup api', { tag: ['@auth', '@api'] }, () => {

  test('validate user can register without a username and one is auto-generated', async ({ request }) => {
    const body = sampleSignupRequestBody();
    expect(body.username).toBeUndefined();

    const response = await sendSignupRequest(request, body);

    await assertSignupSuccess(response, {
      id: expect.any(Number),
      username: expect.any(String),
      userType: 'standard',
      email: body.email,
      phone: body.phone,
    });
  });

  test('validate user can register with a custom username', async ({ request }) => {
    const body = { ...sampleSignupRequestBody(), username: `qasignupapi${Date.now()}` };

    const response = await sendSignupRequest(request, body);

    await assertSignupSuccess(response, {
      id: expect.any(Number),
      username: body.username,
      userType: 'standard',
      email: body.email,
      phone: body.phone,
    });
  });

});
