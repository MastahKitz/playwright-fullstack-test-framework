import { test } from '@playwright/test';
import { viewProductDetails } from './product.flow';
import { assertProductDetails } from './product.assertions';
import { fitnessTracker, snoopyOfficeMug } from './product.data';

test.describe('product details', { tag: '@product' }, () => {

  test('validate user can view in-stock product details', async ({ page }) => {
    await viewProductDetails(page, fitnessTracker);
    await assertProductDetails(page, fitnessTracker);
  });

  test('validate user can view out-of-stock product details', async ({ page }) => {
    await viewProductDetails(page, snoopyOfficeMug);
    await assertProductDetails(page, snoopyOfficeMug);
  });

});
