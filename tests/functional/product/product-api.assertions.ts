import { APIResponse, expect } from '@playwright/test';
import { assertResponseStatus, assertResponseBody } from '../utils/api.utils';
import { ProductListResponseBody, ExpectedProduct } from './product-api.data';
import { TOTAL_PRODUCTS_COUNT } from './product.data';

// "YYYY-MM-DD HH:MM:SS" — the shape the API returns for createdAt/updatedAt.
const TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export async function assertProductListSuccess(response: APIResponse) {
  assertResponseStatus(response, 200);
  const body: ProductListResponseBody = await response.json();
  assertResponseBody(body, {
    success: true,
    meta: { total: TOTAL_PRODUCTS_COUNT },
  }, { exact: false });
  expect.soft(body.data).toHaveLength(TOTAL_PRODUCTS_COUNT);
}

export async function assertProductInList(response: APIResponse, expected: ExpectedProduct) {
  const body: ProductListResponseBody = await response.json();
  const product = body.data.find((item) => item.name === expected.name);
  expect.soft(product, `product "${expected.name}" should be in the list`).toBeDefined();
  assertResponseBody(product ?? {}, {
    id: expected.id,
    name: expected.name,
    slug: expected.slug,
    description: expected.description,
    price: expected.price,
    // stock and the timestamps move on every run against the shared demo server.
    stock: expect.any(Number),
    imageKey: expected.imageKey,
    imageUrl: expected.imageUrl,
    isActive: expected.isActive,
    createdAt: expect.stringMatching(TIMESTAMP),
    updatedAt: expect.stringMatching(TIMESTAMP),
  }, { exact: true });
}
