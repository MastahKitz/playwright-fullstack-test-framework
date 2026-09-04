import { APIRequestContext, APIResponse, expect, PlaywrightWorkerArgs } from '@playwright/test';
import { environment } from '../config/environments';

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

// beforeAll/afterAll run outside test scope, so the test-scoped `request` fixture isn't
// available there. This mints a throwaway APIRequestContext for the duration of `fn` and
// disposes it after, so any flow function (login, createProduct, deleteProduct, ...) can
// run in a hook without a bespoke *InHook variant of its own.
export async function withHookRequestContext<T>(
  playwright: PlaywrightWorkerArgs['playwright'],
  fn: (request: APIRequestContext) => Promise<T>,
): Promise<T> {
  const context = await playwright.request.newContext({ baseURL: environment.baseUrl });
  try {
    return await fn(context);
  } finally {
    await context.dispose();
  }
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
