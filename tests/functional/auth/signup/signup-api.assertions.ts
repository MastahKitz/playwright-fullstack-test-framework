import { APIResponse, expect } from '@playwright/test';
import { assertResponseStatus, assertResponseBody } from '../../utils/api.utils';
import {
  SignupResponseBody,
  ExpectedSignupUser,
  SignupErrorResponseBody,
  SignupValidationErrorResponseBody,
} from './signup-api.data';

export async function assertSignupSuccess(response: APIResponse, expectedUser: ExpectedSignupUser) {
  assertResponseStatus(response, 201);
  const body: SignupResponseBody = await response.json();
  assertResponseBody(body, {
    success: true,
    data: {
      // JWT: base64url header.payload.signature — the token itself is regenerated every run.
      accessToken: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
      user: {
        id: expect.any(Number),
        username: expectedUser.username ?? expect.stringMatching(/^[a-zA-Z0-9_]+$/),
        userType: 'standard',
        email: expectedUser.email,
        phone: expectedUser.phone,
      },
    },
  }, { exact: true });
}

export async function assertRequiredFieldsError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupValidationErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: {
      issues: [
        { code: 'invalid_string', validation: 'email', message: 'Please enter a valid email address', path: ['email'] },
        { code: 'too_small', minimum: 7, type: 'string', inclusive: true, exact: false, message: 'Phone number must be at least 7 digits', path: ['phone'] },
        { code: 'invalid_string', validation: 'regex', message: 'Please enter a valid phone number', path: ['phone'] },
        { code: 'too_small', minimum: 8, type: 'string', inclusive: true, exact: false, message: 'Password must be at least 8 characters', path: ['password'] },
        { code: 'invalid_string', validation: 'regex', message: 'Password must contain at least one uppercase letter', path: ['password'] },
        { code: 'invalid_string', validation: 'regex', message: 'Password must contain at least one number', path: ['password'] },
      ],
      name: 'ZodError',
    },
  }, { exact: true });
}

export async function assertInvalidEmailFormatError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupValidationErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: {
      issues: [{ code: 'invalid_string', validation: 'email', message: 'Please enter a valid email address', path: ['email'] }],
      name: 'ZodError',
    },
  }, { exact: true });
}

export async function assertPhoneTooShortError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupValidationErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: {
      issues: [{ code: 'too_small', minimum: 7, type: 'string', inclusive: true, exact: false, message: 'Phone number must be at least 7 digits', path: ['phone'] }],
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
        { code: 'invalid_string', validation: 'regex', message: 'Password must contain at least one uppercase letter', path: ['password'] },
        { code: 'invalid_string', validation: 'regex', message: 'Password must contain at least one number', path: ['password'] },
      ],
      name: 'ZodError',
    },
  }, { exact: true });
}

export async function assertDuplicateEmailError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: { code: 'BAD_REQUEST', message: 'An account with this email address already exists. Please sign in instead.' },
  }, { exact: true });
}

export async function assertDuplicateUsernameError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: SignupErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: { code: 'BAD_REQUEST', message: 'This username is already taken. Please choose another username.' },
  }, { exact: true });
}
