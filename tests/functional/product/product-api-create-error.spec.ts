import { test } from '@playwright/test';
import { withHookRequestContext } from '../utils/api.utils';
import { generateAccessToken } from '../auth/auth-api.flow';
import { adminUserLoginBody } from '../auth/auth-api.data';
import { sendProductCreateRequest } from './product-api.actions';
import {
  assertInvalidTokenError,
  assertInvalidAuthFormatError,
  assertProductNameRequiredError,
  assertProductPriceMustBePositiveError,
} from './product-api.assertions';
import { sampleProductCreateBody } from './product-api.data';

test.describe('product create api - errors', { tag: ['@product', '@api'] }, () => {
  let accessToken: string;

  test.beforeAll(async ({ playwright }) => {
    accessToken = await withHookRequestContext(playwright, (request) =>
      generateAccessToken(request, adminUserLoginBody),
    );
  });

  test('validate product cannot be created with an invalid token', async ({ request }) => {
    const response = await sendProductCreateRequest(request, 'invalid', sampleProductCreateBody());
    await assertInvalidTokenError(response);
  });

  test('validate product cannot be created with a blank token', async ({ request }) => {
    const response = await sendProductCreateRequest(request, '', sampleProductCreateBody());
    await assertInvalidAuthFormatError(response);
  });

  test('validate product cannot be created with a blank name', async ({ request }) => {
    const response = await sendProductCreateRequest(request, accessToken, { ...sampleProductCreateBody(), name: '' });
    await assertProductNameRequiredError(response);
  });

  test('validate product cannot be created with a price of 0', async ({ request }) => {
    const response = await sendProductCreateRequest(request, accessToken, { ...sampleProductCreateBody(), price: 0 });
    await assertProductPriceMustBePositiveError(response);
  });
});
