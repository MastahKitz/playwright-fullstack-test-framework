import { APIResponse, expect } from '@playwright/test';
import { assertResponseStatus, assertResponseBody } from '../utils/api.utils';
import { LoginResponseBody } from './auth-api.data';

interface ExpectedLoginUser {
  id: number;
  username: string;
  userType: string;
}

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
