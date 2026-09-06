import { test } from '@playwright/test';
import { sendProductListRequest } from './product-api.actions';
import { assertProductListSuccess, assertProductInList } from './product-api.assertions';
import { fitnessTracker, laptopBackpack, snoopyOfficeMug } from './product-api.data';

test.describe('product list api', { tag: ['@product', '@api'] }, () => {

  test('validate user can view the product list', async ({ request }) => {
    const response = await sendProductListRequest(request);
    // KNOWN-FAILURE(#55): hardcoded TOTAL_PRODUCTS_COUNT stale vs shared qademo catalog (24 actual vs 22 expected) — retriage if this changes
    await assertProductListSuccess(response);
    await assertProductInList(response, fitnessTracker);
    await assertProductInList(response, laptopBackpack);
    await assertProductInList(response, snoopyOfficeMug);
  });

});
