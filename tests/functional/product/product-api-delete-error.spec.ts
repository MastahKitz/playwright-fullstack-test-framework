import { test } from '@playwright/test';
import { withHookRequestContext } from '../utils/api.utils';
import { generateAccessToken } from '../auth/auth-api.flow';
import { adminUserLoginBody } from '../auth/auth-api.data';
import { sendProductDeleteRequest } from './product-api.actions';
import {
  assertInvalidTokenError,
  assertInvalidAuthFormatError,
  assertProductNotFoundError,
  assertProductIdRequiredError,
} from './product-api.assertions';

test.describe('product delete api - errors', { tag: ['@product', '@api'] }, () => {
  let accessToken: string;

  test.beforeAll(async ({ playwright }) => {
    accessToken = await withHookRequestContext(playwright, (request) =>
      generateAccessToken(request, adminUserLoginBody),
    );
  });

  test('validate product cannot be deleted with an invalid token', async ({ request }) => {
    const response = await sendProductDeleteRequest(request, 'invalid', 9999);
    await assertInvalidTokenError(response);
  });

  test('validate product cannot be deleted with a blank token', async ({ request }) => {
    const response = await sendProductDeleteRequest(request, '', 9999);
    await assertInvalidAuthFormatError(response);
  });

  test('validate product cannot be deleted with a non-existing id', async ({ request }) => {
    const response = await sendProductDeleteRequest(request, accessToken, 9999);
    await assertProductNotFoundError(response);
  });

  test('validate product cannot be deleted with a blank id', async ({ request }) => {
    const response = await sendProductDeleteRequest(request, accessToken, '');
    await assertProductIdRequiredError(response);
  });
});
