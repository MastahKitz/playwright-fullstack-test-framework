import { APIRequestContext } from '@playwright/test';
import { sendApiRequest } from '../utils/api.utils';

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
