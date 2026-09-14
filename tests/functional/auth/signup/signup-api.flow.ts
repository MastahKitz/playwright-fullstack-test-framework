import { APIRequestContext } from '@playwright/test';
import { assertResponseStatus } from '../../utils/api.utils';
import { sendSignupRequest, captureRegisteredApiUser } from './signup-api.actions';
import { SignupRequestBody, RegisteredApiUser } from './signup-api.data';

export async function registerUser(request: APIRequestContext, body: SignupRequestBody): Promise<RegisteredApiUser> {
  const response = await sendSignupRequest(request, body);
  assertResponseStatus(response, 201);
  return captureRegisteredApiUser(response);
}
