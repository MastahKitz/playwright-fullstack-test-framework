import { test } from '@playwright/test';
import { viewProductList } from './product.flow';
import { assertProductListPage, assertProductInList } from './product.assertions';
import { fitnessTracker, laptopBackpack, snoopyOfficeMug } from './product.data';
import { sendProductListRequest } from './product-api.actions';

test.describe('product list', { tag: '@product' }, () => {

  test('validate user can view the product list page', async ({ page, request }) => {
    // total product count drifts as the shared demo catalog grows — read the
    // current count from the API instead of hardcoding it.
    const response = await sendProductListRequest(request);
    const { data } = await response.json();
    await viewProductList(page);
    await assertProductListPage(page, data.length);
    await assertProductInList(page, fitnessTracker);
    await assertProductInList(page, laptopBackpack);
    await assertProductInList(page, snoopyOfficeMug);
  });

});
