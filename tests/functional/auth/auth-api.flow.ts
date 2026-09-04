import { APIRequestContext } from '@playwright/test';
import { assertResponseStatus } from '../utils/api.utils';
import { sendLoginRequest, captureAccessToken } from './auth-api.actions';
import { LoginRequestBody } from './auth-api.data';

export async function generateAccessToken(request: APIRequestContext, body: LoginRequestBody): Promise<string> {
  const response = await sendLoginRequest(request, body);
  assertResponseStatus(response, 200);
  return captureAccessToken(response);
}
