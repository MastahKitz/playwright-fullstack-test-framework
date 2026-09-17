import { test } from '@playwright/test';
import { withHookRequestContext } from '../../utils/api.utils';
import { sendSignupRequest } from './signup-api.actions';
import { registerAccount } from './signup-api.flow';
import { sampleSignupRequestBody, SignupRequestBody } from './signup-api.data';
import {
  assertRequiredFieldsError,
  assertInvalidEmailFormatError,
  assertPhoneTooShortError,
  assertWeakPasswordError,
  assertDuplicateEmailError,
  assertDuplicateUsernameError,
} from './signup-api.assertions';

test.describe('signup api - errors', { tag: ['@signup', '@api', '@mutating'] }, () => {
  // arranged once and only ever read (duplicate-checked) by the tests below, so
  // no inter-test ordering dependency requiring serial mode
  let existingAccount: SignupRequestBody;

  test.beforeAll(async ({ playwright }) => {
    existingAccount = { ...sampleSignupRequestBody(), username: `sampleSignupApiDup${Date.now()}${Math.random().toString(36).slice(2, 6)}` };
    await withHookRequestContext(playwright, (request) => registerAccount(request, existingAccount));
  });

  test('validate user cannot create an account with required fields left blank', async ({ request }) => {
    const response = await sendSignupRequest(request, { email: '', phone: '', password: '', confirmPassword: '' });
    await assertRequiredFieldsError(response);
  });

  test('validate user cannot create an account with an invalid email format', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: 'notanemail' });
    await assertInvalidEmailFormatError(response);
  });

  test('validate user cannot create an account with a phone number that is too short', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), phone: '123' });
    await assertPhoneTooShortError(response);
  });

  test('validate user cannot create an account with a password that does not meet complexity requirements', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), password: 'weak', confirmPassword: 'weak' });
    await assertWeakPasswordError(response);
  });

  test('validate user cannot create an account with a duplicate email address', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), email: existingAccount.email });
    await assertDuplicateEmailError(response);
  });

  test('validate user cannot create an account with a duplicate username', async ({ request }) => {
    const response = await sendSignupRequest(request, { ...sampleSignupRequestBody(), username: existingAccount.username });
    await assertDuplicateUsernameError(response);
  });

});
