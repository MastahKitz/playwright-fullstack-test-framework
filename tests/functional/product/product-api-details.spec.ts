import { test } from '@playwright/test';
import { sendProductDetailsRequest } from './product-api.actions';
import { assertProductDetailsSuccess } from './product-api.assertions';
import { fitnessTracker, snoopyOfficeMug } from './product-api.data';

test.describe('product details api', { tag: ['@product', '@api'] }, () => {

  test('validate user can view in-stock product details', async ({ request }) => {
    const response = await sendProductDetailsRequest(request, fitnessTracker.slug);
    await assertProductDetailsSuccess(response, fitnessTracker);
  });

  test('validate user can view out-of-stock product details', async ({ request }) => {
    const response = await sendProductDetailsRequest(request, snoopyOfficeMug.slug);
    await assertProductDetailsSuccess(response, snoopyOfficeMug);
  });

});
