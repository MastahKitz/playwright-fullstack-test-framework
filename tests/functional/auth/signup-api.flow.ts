import { APIRequestContext } from '@playwright/test';
import { assertResponseStatus } from '../utils/api.utils';
import { sendSignupRequest, captureSignupUser } from './signup-api.actions';
import { SignupRequestBody, ExpectedSignupUser } from './signup-api.data';

export async function registerViaApi(request: APIRequestContext, body: SignupRequestBody): Promise<ExpectedSignupUser> {
  const response = await sendSignupRequest(request, body);
  assertResponseStatus(response, 201);
  return captureSignupUser(response);
}
