import { APIRequestContext, PlaywrightWorkerArgs } from '@playwright/test';
import { assertResponseStatus } from '../utils/api.utils';
import { environment } from '../config/environments';
import { sendLoginRequest, captureAccessToken } from './auth-api.actions';
import { LoginRequestBody } from './auth-api.data';

export async function generateAccessToken(request: APIRequestContext, body: LoginRequestBody): Promise<string> {
  const response = await sendLoginRequest(request, body);
  assertResponseStatus(response, 200);
  return captureAccessToken(response);
}

// For beforeAll, where the test-scoped `request` fixture isn't available: mints a
// token through its own throwaway context so a whole spec logs in once, not per test.
export async function generateAccessTokenInHook(
  playwright: PlaywrightWorkerArgs['playwright'],
  body: LoginRequestBody,
): Promise<string> {
  const context = await playwright.request.newContext({ baseURL: environment.baseUrl });
  try {
    return await generateAccessToken(context, body);
  } finally {
    await context.dispose();
  }
}
