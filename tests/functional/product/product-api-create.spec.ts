import { test } from '@playwright/test';
import { withHookRequestContext } from '../utils/api.utils';
import { generateAccessToken } from '../auth/auth-api.flow';
import { adminUserLoginBody } from '../auth/auth-api.data';
import { sendProductCreateRequest, captureCreatedProductRefs } from './product-api.actions';
import { assertProductCreateSuccess } from './product-api.assertions';
import { assertProductExists, deleteProduct } from './product-api.flow';
import { sampleProductCreateBody, expectedProduct } from './product-api.data';
import type { CreatedProductRefs } from './product-api.data';

test.describe('product create api', { tag: ['@product', '@api'] }, () => {
  let accessToken: string;
  let createdProductRefs: CreatedProductRefs | undefined;

  test.beforeAll(async ({ playwright }) => {
    accessToken = await withHookRequestContext(playwright, (request) =>
      generateAccessToken(request, adminUserLoginBody),
    );
  });

  test.afterEach(async ({ request }) => {
    if (!createdProductRefs) return;
    await deleteProduct(request, accessToken, createdProductRefs.id);
    createdProductRefs = undefined;
  });

  test('validate admin can create a product', async ({ request }) => {
    const productCreateRequestBody = sampleProductCreateBody();

    const response = await sendProductCreateRequest(request, accessToken, productCreateRequestBody);
    await assertProductCreateSuccess(response, productCreateRequestBody.name);

    createdProductRefs = await captureCreatedProductRefs(response);
    await assertProductExists(request, expectedProduct(productCreateRequestBody, createdProductRefs));
  });
});
