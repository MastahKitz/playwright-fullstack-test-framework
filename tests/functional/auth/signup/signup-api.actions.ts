import { APIRequestContext, APIResponse } from '@playwright/test';
import { sendApiRequest } from '../../utils/api.utils';
import { SignupRequestBody, SignupResponseBody, RegisteredApiUser } from './signup-api.data';

export async function sendSignupRequest(request: APIRequestContext, body: SignupRequestBody) {
  return sendApiRequest(request, {
    method: 'POST',
    url: '/api/auth/signup',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function captureRegisteredApiUser(response: APIResponse): Promise<RegisteredApiUser> {
  const body: SignupResponseBody = await response.json();
  return body.data.user;
}
