import { APIResponse, expect } from '@playwright/test';
import { assertResponseStatus, assertResponseBody } from '../utils/api.utils';
import {
  ProductListResponseBody,
  ProductDetailsResponseBody,
  ProductErrorResponseBody,
  ProductCreateRequestBody,
  ProductCreateResponseBody,
  ProductDeleteResponseBody,
  ExpectedProduct,
  expectedSlug,
} from './product-api.data';
import { TOTAL_PRODUCTS_COUNT } from './product.data';

// "YYYY-MM-DD HH:MM:SS" — the shape the API returns for createdAt/updatedAt.
const TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

// reusable by both product list and product details assertions
function expectedProductBody(expected: ExpectedProduct) {
  return {
    id: expected.id,
    name: expected.name,
    slug: expected.slug,
    description: expected.description,
    price: expected.price,
    // exact count drifts run-to-run; the 0-vs-positive check is assertStockCount.
    stock: expect.any(Number),
    imageKey: expected.imageKey,
    imageUrl: expected.imageUrl,
    isActive: expected.isActive,
    createdAt: expect.stringMatching(TIMESTAMP),
    updatedAt: expect.stringMatching(TIMESTAMP),
  };
}

function assertStockCount(stock: number | undefined, expected: ExpectedProduct) {
  if (expected.inStock) {
    expect.soft(stock, `"${expected.name}" should be in stock`).toBeGreaterThan(0);
  } else {
    expect.soft(stock, `"${expected.name}" should be out of stock`).toBe(0);
  }
}

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
  assertResponseBody(product ?? {}, expectedProductBody(expected), { exact: true });
  assertStockCount(product?.stock, expected);
}

export async function assertProductNotInList(response: APIResponse, slug: string) {
  const body: ProductListResponseBody = await response.json();
  const product = body.data.find((item) => item.slug === slug);
  expect.soft(product, `product "${slug}" should not be in the list`).toBeUndefined();
}

export async function assertProductDetailsSuccess(response: APIResponse, expected: ExpectedProduct) {
  assertResponseStatus(response, 200);
  const body: ProductDetailsResponseBody = await response.json();
  assertResponseBody(body, {
    success: true,
    data: expectedProductBody(expected),
  }, { exact: true });
  assertStockCount(body.data.stock, expected);
}

export async function assertProductNotFoundError(response: APIResponse) {
  assertResponseStatus(response, 404);
  const body: ProductErrorResponseBody = await response.json();
  assertResponseBody(body, {
    success: false,
    error: { code: 'NOT_FOUND', message: 'Product not found' },
  }, { exact: true });
}

export async function assertProductCreateSuccess(
  response: APIResponse,
  productCreateRequestBody: ProductCreateRequestBody,
) {
  assertResponseStatus(response, 201);
  const body: ProductCreateResponseBody = await response.json();
  assertResponseBody(body, {
    success: true,
    data: {
      id: expect.any(Number),
      slug: expectedSlug(productCreateRequestBody.name),
    },
  }, { exact: true });
}

export async function assertProductDeleteSuccess(response: APIResponse, expectedId: number) {
  assertResponseStatus(response, 200);
  const body: ProductDeleteResponseBody = await response.json();
  assertResponseBody(body, {
    success: true,
    data: { id: expectedId, deleted: true },
  }, { exact: true });
}
