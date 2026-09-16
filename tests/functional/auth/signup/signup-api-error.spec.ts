import { test } from '@playwright/test';
import { sendSignupRequest } from './signup-api.actions';
import { registerAccount } from './signup-api.flow';
import { sampleSignupRequestBody, sampleUsername } from './signup-api.data';
import {
  assertInvalidEmailFormatError,
  assertBlankPhoneError,
  assertWeakPasswordError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup-api.assertions';

test.describe('signup api - errors', { tag: ['@signup', '@api'] }, () => {

  test('validate user cannot register with a blank email', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: '' });
    await assertInvalidEmailFormatError(response);
  });

  test('validate user cannot register with an invalid email format', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: 'not-an-email' });
    await assertInvalidEmailFormatError(response);
  });

  test('validate user cannot register with a blank phone number', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), phone: '' });
    await assertBlankPhoneError(response);
  });

  test('validate user cannot register with a weak password', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), password: '123', confirmPassword: '123' });
    await assertWeakPasswordError(response);
  });

  test('validate user cannot register with an email that is already registered', async ({ request }) => {
    const existingUser = await registerAccount(request, sampleSignupRequestBody());

    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: existingUser.email });
    await assertDuplicateEmailError(response);
  });

  test('validate user cannot register with a username that is already taken', async ({ request }) => {
    const username = sampleUsername();
    await registerAccount(request, { ...sampleSignupRequestBody(), username });

    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), username });
    await assertDuplicateUsernameError(response);
  });

});
