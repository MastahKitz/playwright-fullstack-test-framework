import { test } from '@playwright/test';
import { withHookRequestContext } from '../utils/api.utils';
import { sendSignupRequest } from './signup-api.actions';
import { sampleSignupRequestBody } from './signup-api.data';
import { registerViaApi } from './signup-api.flow';
import {
  assertInvalidEmailError,
  assertPhoneRequiredError,
  assertPasswordRequiredError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup-api.assertions';

test.describe('signup api - errors', { tag: ['@auth', '@api'] }, () => {
  let existingUser: { email: string; username: string };

  test.beforeAll(async ({ playwright }) => {
    existingUser = await withHookRequestContext(playwright, async (request) => {
      const body = { ...sampleSignupRequestBody(), username: `qasignupapidup${Date.now()}` };
      const user = await registerViaApi(request, body);
      return { email: user.email, username: user.username };
    });
  });

  test('validate user cannot register with a blank email', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: '' });
    await assertInvalidEmailError(response);
  });

  test('validate user cannot register with a blank phone number', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), phone: '' });
    await assertPhoneRequiredError(response);
  });

  test('validate user cannot register with a blank password', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), password: '', confirmPassword: '' });
    await assertPasswordRequiredError(response);
  });

  test('validate user cannot register with a duplicate email address', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: existingUser.email });
    await assertDuplicateEmailError(response);
  });

  test('validate user cannot register with a duplicate username', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), username: existingUser.username });
    await assertDuplicateUsernameError(response);
  });
});
