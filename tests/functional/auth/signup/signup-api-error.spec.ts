import { test } from '@playwright/test';
import { sendSignupRequest } from './signup-api.actions';
import { registerAccount } from './signup-api.flow';
import {
  assertInvalidEmailError,
  assertInvalidPhoneError,
  assertBlankPasswordError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup-api.assertions';
import { sampleSignupFormData } from './signup.data';

test.describe('signup api - errors', { tag: ['@signup', '@api', '@mutating'] }, () => {

  test('validate user cannot register with an invalid email format', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupFormData(), email: 'not-an-email' });
    await assertInvalidEmailError(response);
  });

  test('validate user cannot register with a blank email', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupFormData(), email: '' });
    await assertInvalidEmailError(response);
  });

  test('validate user cannot register with a blank phone number', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupFormData(), phone: '' });
    await assertInvalidPhoneError(response);
  });

  test('validate user cannot register with a blank password', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupFormData(), password: '', confirmPassword: '' });
    await assertBlankPasswordError(response);
  });

  test('validate user cannot register with an email already in use', async ({ request }) => {
    const signupRequestBody = sampleSignupFormData();
    await registerAccount(request, signupRequestBody);

    const response = await sendSignupRequest(request, { ...sampleSignupFormData(), email: signupRequestBody.email });
    await assertDuplicateEmailError(response);
  });

  test('validate user cannot register with a username already in use', async ({ request }) => {
    const username = `sample-qa-signup-api-dup-${Date.now()}`;
    await registerAccount(request, { ...sampleSignupFormData(), username });

    const response = await sendSignupRequest(request, { ...sampleSignupFormData(), username });
    await assertDuplicateUsernameError(response);
  });

});
