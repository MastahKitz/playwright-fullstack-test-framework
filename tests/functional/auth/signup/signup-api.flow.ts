import { APIRequestContext } from '@playwright/test';
import { assertResponseStatus } from '../../utils/api.utils';
import { sendSignupRequest, captureSignupAccessToken } from './signup-api.actions';
import { SignupRequestBody } from './signup-api.data';

export async function registerAccountViaApi(request: APIRequestContext, body: SignupRequestBody): Promise<string> {
  const response = await sendSignupRequest(request, body);
  assertResponseStatus(response, 201);
  return captureSignupAccessToken(response);
}
