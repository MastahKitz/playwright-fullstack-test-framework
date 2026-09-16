import { APIResponse, expect } from '@playwright/test';
import { assertResponseStatus, assertResponseBody } from '../../utils/api.utils';
import { SignupResponseBody, ExpectedSignupUser, SignupDuplicateErrorResponseBody, SignupValidationErrorResponseBody } from './signup-api.data';

export async function assertSignupSuccess(response: APIResponse, expectedUser: ExpectedSignupUser) {
  assertResponseStatus(response, 201);
  const body: SignupResponseBody = await response.json();
  assertResponseBody(body, {
    success: true,
    data: {
      // JWT: base64url header.payload.signature — the token itself is regenerated every run.
      accessToken: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
      user: expectedUser,
    },
  }, { exact: true });
}

// Username isn't known ahead of time when it's omitted (AC3: the system generates one) —
// match it as a non-blank string rather than pinning the exact generated value.
export async function assertSignupSuccessWithGeneratedUsername(response: APIResponse, expectedEmail: string, expectedPhone: string) {
  assertResponseStatus(response, 201);
  const body: SignupResponseBody = await response.json();
  assertResponseBody(body, {
    success: true,
    data: {
      accessToken: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
      user: {
        id: expect.any(Number),
        username: expect.stringMatching(/^\S+$/),
        userType: 'standard',
        email: expectedEmail,
        phone: expectedPhone,
      },
    },
  }, { exact: true });
}

export async function assertDuplicateEmailError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupDuplicateErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: { code: 'BAD_REQUEST', message: 'An account with this email address already exists. Please sign in instead.' },
  }, { exact: true });
}

export async function assertDuplicateUsernameError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupDuplicateErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: { code: 'BAD_REQUEST', message: 'This username is already taken. Please choose another username.' },
  }, { exact: true });
}

export async function assertInvalidEmailFormatError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupValidationErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: {
      issues: [{ validation: 'email', code: 'invalid_string', message: 'Please enter a valid email address', path: ['email'] }],
      name: 'ZodError',
    },
  }, { exact: true });
}

export async function assertBlankPhoneError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupValidationErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: {
      issues: [
        { code: 'too_small', minimum: 7, type: 'string', inclusive: true, exact: false, message: 'Phone number must be at least 7 digits', path: ['phone'] },
        { validation: 'regex', code: 'invalid_string', message: 'Please enter a valid phone number', path: ['phone'] },
      ],
      name: 'ZodError',
    },
  }, { exact: true });
}

export async function assertWeakPasswordError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupValidationErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: {
      issues: [
        { code: 'too_small', minimum: 8, type: 'string', inclusive: true, exact: false, message: 'Password must be at least 8 characters', path: ['password'] },
        { validation: 'regex', code: 'invalid_string', message: 'Password must contain at least one uppercase letter', path: ['password'] },
      ],
      name: 'ZodError',
    },
  }, { exact: true });
}
