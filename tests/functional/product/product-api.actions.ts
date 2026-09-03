import { APIRequestContext } from '@playwright/test';
import { sendApiRequest } from '../utils/api.utils';

export async function sendProductListRequest(request: APIRequestContext) {
  return sendApiRequest(request, {
    method: 'GET',
    url: '/api/products',
  });
}
