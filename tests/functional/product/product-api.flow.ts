import { APIRequestContext } from '@playwright/test';
import { assertResponseStatus } from '../utils/api.utils';
import {
  sendProductListRequest,
  sendProductDetailsRequest,
  sendProductCreateRequest,
  sendProductDeleteRequest,
  captureCreatedProductRefs,
} from './product-api.actions';
import { assertProductInList, assertProductDetailsSuccess } from './product-api.assertions';
import { ProductCreateRequestBody, CreatedProductRefs, ExpectedProduct } from './product-api.data';

export async function createProduct(
  request: APIRequestContext,
  accessToken: string,
  body: ProductCreateRequestBody,
): Promise<CreatedProductRefs> {
  const response = await sendProductCreateRequest(request, accessToken, body);
  assertResponseStatus(response, 201);
  return captureCreatedProductRefs(response);
}

export async function deleteProduct(
  request: APIRequestContext,
  accessToken: string,
  id: number,
): Promise<void> {
  const response = await sendProductDeleteRequest(request, accessToken, id);
  assertResponseStatus(response, 200);
}

export async function assertProductExists(request: APIRequestContext, expected: ExpectedProduct) {
  const listResponse = await sendProductListRequest(request);
  await assertProductInList(listResponse, expected);
  const detailsResponse = await sendProductDetailsRequest(request, expected.slug);
  await assertProductDetailsSuccess(detailsResponse, expected);
}
