import { test } from '@playwright/test';
import { sendProductListRequest } from './product-api.actions';
import { assertProductListSuccess, assertProductInList } from './product-api.assertions';
import { fitnessTracker, laptopBackpack, snoopyOfficeMug } from './product-api.data';

test.describe('product list api', { tag: ['@product', '@api'] }, () => {

  test('validate user can view the product list', async ({ request }) => {
    const response = await sendProductListRequest(request);
    // KNOWN-FAILURE(#52): TOTAL_PRODUCTS_COUNT (22) is stale vs live qademo catalog (21) — retriage if this changes
    await assertProductListSuccess(response);
    await assertProductInList(response, fitnessTracker);
    await assertProductInList(response, laptopBackpack);
    await assertProductInList(response, snoopyOfficeMug);
  });

});
