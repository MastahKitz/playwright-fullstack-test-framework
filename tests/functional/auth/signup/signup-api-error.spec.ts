import { test } from '@playwright/test';
import { sendSignupRequest } from './signup-api.actions';
import { registerUser } from './signup-api.flow';
import { sampleSignupRequestBody } from './signup-api.data';
import {
  assertEmailInvalidError,
  assertPhoneRequiredError,
  assertPhoneInvalidFormatError,
  assertPasswordRequiredError,
  assertWeakPasswordError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup-api.assertions';

test.describe('signup api - errors', { tag: ['@auth', '@api'] }, () => {

  test('validate user cannot register with a blank email', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: '' });
    await assertEmailInvalidError(response);
  });

  test('validate user cannot register with an invalid email format', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: 'not-an-email' });
    await assertEmailInvalidError(response);
  });

  test('validate user cannot register with a blank phone number', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), phone: '' });
    await assertPhoneRequiredError(response);
  });

  test('validate user cannot register with an invalid phone number format', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), phone: 'abcdefgh' });
    await assertPhoneInvalidFormatError(response);
  });

  test('validate user cannot register with a blank password', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), password: '', confirmPassword: '' });
    await assertPasswordRequiredError(response);
  });

  test('validate user cannot register with a weak password', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), password: 'weakpassword', confirmPassword: 'weakpassword' });
    await assertWeakPasswordError(response);
  });

  test('validate user cannot register with an email that is already registered', async ({ request }) => {
    const existingUser = await registerUser(request, sampleSignupRequestBody());

    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: existingUser.email });

    await assertDuplicateEmailError(response);
  });

  test('validate user cannot register with a username that is already taken', async ({ request }) => {
    const existingUser = await registerUser(request, sampleSignupRequestBody());

    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), username: existingUser.username });

    await assertDuplicateUsernameError(response);
  });

});
