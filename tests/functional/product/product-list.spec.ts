import { test } from '@playwright/test';
import { viewProductList } from './product.flow';
import { assertProductListPage, assertProductInList } from './product.assertions';
import { fitnessTracker, laptopBackpack, snoopyOfficeMug, TOTAL_PRODUCTS_COUNT } from './product.data';

test.describe('product list', { tag: '@product' }, () => {

  test('validate user can view the product list page', async ({ page }) => {
    await viewProductList(page);
    // KNOWN-FAILURE(#56): hardcoded TOTAL_PRODUCTS_COUNT stale vs shared qademo catalog (24 actual vs 22 expected) — retriage if this changes
    await assertProductListPage(page, TOTAL_PRODUCTS_COUNT);
    await assertProductInList(page, fitnessTracker);
    await assertProductInList(page, laptopBackpack);
    await assertProductInList(page, snoopyOfficeMug);
  });

});
