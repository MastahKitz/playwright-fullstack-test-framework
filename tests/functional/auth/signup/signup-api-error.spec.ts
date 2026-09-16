import { test } from '@playwright/test';
import { withHookRequestContext } from '../../utils/api.utils';
import { sendSignupRequest } from './signup-api.actions';
import { registerAccountViaApi } from './signup-api.flow';
import { sampleSignupRequestBody, SignupRequestBody } from './signup-api.data';
import { credentials } from '../auth.data';
import {
  assertInvalidEmailError,
  assertBlankPhoneError,
  assertBlankPasswordError,
  assertWeakPasswordError,
  assertDuplicateUsernameError,
  assertDuplicateEmailError,
} from './signup-api.assertions';

test.describe('signup api - errors', { tag: ['@signup', '@api'] }, () => {

  test('validate user cannot register with an invalid email format', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: 'not-an-email' });
    await assertInvalidEmailError(response);
  });

  test('validate user cannot register with a blank phone number', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), phone: '' });
    await assertBlankPhoneError(response);
  });

  test('validate user cannot register with a blank password', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), password: '', confirmPassword: '' });
    await assertBlankPasswordError(response);
  });

  test('validate user cannot register with a weak password', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), password: 'weakpass', confirmPassword: 'weakpass' });
    await assertWeakPasswordError(response);
  });

  // standardUser already exists, so this needs no arrange step of its own — unlike the
  // duplicate-email describe below, which needs a real account created first.
  test('validate user cannot register with a duplicate username', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), username: credentials.standardUser.username });
    await assertDuplicateUsernameError(response);
  });

});

test.describe('signup api - duplicate email', { tag: ['@signup', '@api', '@mutating'] }, () => {
  let existingAccount: SignupRequestBody;

  test.beforeAll(async ({ playwright }) => {
    existingAccount = sampleSignupRequestBody();
    await withHookRequestContext(playwright, (request) => registerAccountViaApi(request, existingAccount));
  });

  test('validate user cannot register with a duplicate email', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: existingAccount.email });
    await assertDuplicateEmailError(response);
  });
});
