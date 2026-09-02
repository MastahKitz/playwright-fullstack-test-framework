import { APIRequestContext, APIResponse, expect } from '@playwright/test';

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

export function assertResponseStatus(response: APIResponse, expectedStatus: number) {
  expect.soft(response.status()).toBe(expectedStatus);
}

export function assertResponseBody(actual: unknown, expected: Record<string, unknown>, options?: { exact?: boolean }) {
  if (options?.exact) {
    expect.soft(actual).toEqual(expected);
  } else {
    expect.soft(actual).toMatchObject(expected);
  }
}
