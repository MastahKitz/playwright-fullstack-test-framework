import { APIRequestContext, APIResponse } from '@playwright/test';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequestParams {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: object;
}

export async function sendApiRequest(request: APIRequestContext, params: ApiRequestParams): Promise<APIResponse> {
  const { method, url, headers, body } = params;
  return request.fetch(url, { method, headers, data: body });
}
