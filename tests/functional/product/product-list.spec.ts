import { test } from '@playwright/test';
import { viewProductList } from './product.flow';
import { assertProductListPage, assertProductInList } from './product.assertions';
import { fitnessTracker, laptopBackpack, snoopyOfficeMug, TOTAL_PRODUCTS_COUNT } from './product.data';

test.describe('product list', { tag: '@product' }, () => {

  test('validate user can view the product list page', async ({ page }) => {
    await viewProductList(page);
    // KNOWN-FAILURE(#64): hardcoded TOTAL_PRODUCTS_COUNT (22) is stale vs live qademo catalog (24) — retriage if this changes
    await assertProductListPage(page, TOTAL_PRODUCTS_COUNT);
    await assertProductInList(page, fitnessTracker);
    await assertProductInList(page, laptopBackpack);
    await assertProductInList(page, snoopyOfficeMug);
  });

});
