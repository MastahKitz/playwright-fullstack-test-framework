import { APIRequestContext, APIResponse } from '@playwright/test';
import { sendApiRequest } from '../utils/api.utils';
import { ProductCreateRequestBody, ProductCreateResponseBody, CreatedProductRefs } from './product-api.data';

export async function sendProductListRequest(request: APIRequestContext) {
  return sendApiRequest(request, {
    method: 'GET',
    url: '/api/products',
  });
}

export async function sendProductDetailsRequest(request: APIRequestContext, slug: string) {
  return sendApiRequest(request, {
    method: 'GET',
    url: `/api/products/${slug}`,
  });
}

export async function sendProductCreateRequest(
  request: APIRequestContext,
  accessToken: string,
  body: ProductCreateRequestBody,
) {
  return sendApiRequest(request, {
    method: 'POST',
    url: '/api/products',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body,
  });
}

export async function sendProductDeleteRequest(
  request: APIRequestContext,
  accessToken: string,
  id: number,
) {
  return sendApiRequest(request, {
    method: 'DELETE',
    url: `/api/products/${id}`,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function captureCreatedProductRefs(response: APIResponse): Promise<CreatedProductRefs> {
  const body: ProductCreateResponseBody = await response.json();
  return { id: body.data.id, slug: body.data.slug };
}
