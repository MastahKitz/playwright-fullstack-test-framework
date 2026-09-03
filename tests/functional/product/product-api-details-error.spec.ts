import { test } from '@playwright/test';
import { sendProductDetailsRequest } from './product-api.actions';
import { assertProductNotFoundError } from './product-api.assertions';

test.describe('product details api - errors', { tag: ['@product', '@api'] }, () => {

  test('validate user cannot view a product that does not exist', async ({ request }) => {
    const response = await sendProductDetailsRequest(request, 'no-such-product');
    await assertProductNotFoundError(response);
  });

});
