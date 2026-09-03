import { APIResponse, expect } from '@playwright/test';
import { assertResponseStatus, assertResponseBody } from '../utils/api.utils';
import { LoginResponseBody, LogoutResponseBody, ExpectedLoginUser, AuthErrorResponseBody, ValidationErrorResponseBody } from './auth-api.data';

export async function assertLoginSuccess(response: APIResponse, expectedUser: ExpectedLoginUser) {
  assertResponseStatus(response, 200);
  const body: LoginResponseBody = await response.json();
  assertResponseBody(body, {
    success: true,
    data: {
      // JWT: base64url header.payload.signature — the token itself is regenerated every run.
      accessToken: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
      user: expectedUser,
    },
  }, { exact: true });
}

export async function assertLogoutSuccess(response: APIResponse) {
  assertResponseStatus(response, 200);
  const body: LogoutResponseBody = await response.json();
  assertResponseBody(body, {
    success: true,
    data: { message: 'Logged out successfully' },
  }, { exact: true });
}

export async function assertInvalidCredentialsError(response: APIResponse) {
  assertResponseStatus(response, 401);
  const body: AuthErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
  }, { exact: true });
}

export async function assertAccountLockedError(response: APIResponse) {
  assertResponseStatus(response, 403);
  const body: AuthErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: { code: 'ACCOUNT_LOCKED', message: 'Account is locked' },
  }, { exact: true });
}

export async function assertUsernameRequiredError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: ValidationErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: {
      issues: [{ code: 'too_small', minimum: 1, type: 'string', inclusive: true, exact: false, message: 'Username is required', path: ['username'] }],
      name: 'ZodError',
    },
  }, { exact: true });
}

export async function assertPasswordRequiredError(response: APIResponse) {
  assertResponseStatus(response, 400);
  const body: ValidationErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: {
      issues: [{ code: 'too_small', minimum: 1, type: 'string', inclusive: true, exact: false, message: 'Password is required', path: ['password'] }],
      name: 'ZodError',
    },
  }, { exact: true });
}
