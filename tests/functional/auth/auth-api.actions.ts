import { APIRequestContext } from '@playwright/test';
import { sendApiRequest } from '../utils/api.utils';
import { LoginRequestBody } from './auth-api.data';

export async function sendLoginRequest(request: APIRequestContext, body: LoginRequestBody) {
  return sendApiRequest(request, {
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
