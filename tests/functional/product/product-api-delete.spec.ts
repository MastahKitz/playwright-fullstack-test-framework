import { test } from '@playwright/test';
import { generateAccessTokenInHook } from '../auth/auth-api.flow';
import { adminUserLoginBody } from '../auth/auth-api.data';
import { sendProductDeleteRequest } from './product-api.actions';
import { assertProductDeleteSuccess } from './product-api.assertions';
import { createProduct, assertProductNotExists } from './product-api.flow';
import { sampleProductCreateBody } from './product-api.data';

test.describe('product delete api', { tag: ['@product', '@api'] }, () => {
  let accessToken: string;

  test.beforeAll(async ({ playwright }) => {
    accessToken = await generateAccessTokenInHook(playwright, adminUserLoginBody);
  });

  test('validate admin can delete a product', async ({ request }) => {
    const createdProductRefs = await createProduct(request, accessToken, sampleProductCreateBody());

    const response = await sendProductDeleteRequest(request, accessToken, createdProductRefs.id);
    await assertProductDeleteSuccess(response, createdProductRefs.id);

    await assertProductNotExists(request, createdProductRefs.slug);
  });
});
