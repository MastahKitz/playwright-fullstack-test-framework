import { APIRequestContext, APIResponse } from '@playwright/test';
import { sendApiRequest } from '../utils/api.utils';
import { LoginRequestBody, LoginResponseBody } from './auth-api.data';

export async function sendLoginRequest(request: APIRequestContext, body: LoginRequestBody) {
  return sendApiRequest(request, {
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function captureAccessToken(response: APIResponse): Promise<string> {
  const body: LoginResponseBody = await response.json();
  return body.data.accessToken;
}
