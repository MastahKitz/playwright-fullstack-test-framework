import { APIResponse, expect } from '@playwright/test';
import { assertResponseStatus, assertResponseBody } from '../../utils/api.utils';
import { AuthErrorResponseBody } from '../auth-api.data';
import { SignupResponseBody, SignupValidationErrorResponseBody } from './signup-api.data';

export interface ExpectedRegisteredUser {
  username?: string;
  userType: string;
  email: string;
  phone: string;
}

export async function assertSignupSuccess(response: APIResponse, expected: ExpectedRegisteredUser) {
  assertResponseStatus(response, 201);
  const body: SignupResponseBody = await response.json();
  assertResponseBody(body, {
    success: true,
    data: {
      // JWT: base64url header.payload.signature — the token itself is regenerated every run.
      accessToken: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
      user: {
        id: expect.any(Number),
        // when no username is supplied the server generates one — only its non-blankness is fixed
        username: expected.username ?? expect.stringMatching(/\S+/),
        userType: expected.userType,
        email: expected.email,
        phone: expected.phone,
      },
    },
  }, { exact: true });
}

export async function assertEmailInvalidError(response: APIResponse) {
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

export async function assertPhoneRequiredError(response: APIResponse) {
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

export async function assertPhoneInvalidFormatError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupValidationErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: {
      issues: [{ validation: 'regex', code: 'invalid_string', message: 'Please enter a valid phone number', path: ['phone'] }],
      name: 'ZodError',
    },
  }, { exact: true });
}

export async function assertPasswordRequiredError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupValidationErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: {
      issues: [
        { code: 'too_small', minimum: 8, type: 'string', inclusive: true, exact: false, message: 'Password must be at least 8 characters', path: ['password'] },
        { validation: 'regex', code: 'invalid_string', message: 'Password must contain at least one uppercase letter', path: ['password'] },
        { validation: 'regex', code: 'invalid_string', message: 'Password must contain at least one number', path: ['password'] },
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
        { validation: 'regex', code: 'invalid_string', message: 'Password must contain at least one uppercase letter', path: ['password'] },
        { validation: 'regex', code: 'invalid_string', message: 'Password must contain at least one number', path: ['password'] },
      ],
      name: 'ZodError',
    },
  }, { exact: true });
}

export async function assertDuplicateEmailError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: AuthErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: { code: 'BAD_REQUEST', message: 'An account with this email address already exists. Please sign in instead.' },
  }, { exact: true });
}

export async function assertDuplicateUsernameError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: AuthErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: { code: 'BAD_REQUEST', message: 'This username is already taken. Please choose another username.' },
  }, { exact: true });
}
