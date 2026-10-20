import 'server-only';

import type { ApiErrorBody } from '@/types/api/common';
import { endpoints, type EndpointName } from './endpoints';

export type QueryValue = string | number | boolean | null | undefined;

export interface ApiFetchOptions {
  /** Values for {placeholders} in the endpoint path. */
  params?: Record<string, string>;
  /** Query string. null, undefined and '' are dropped; booleans become 1 / 0. */
  query?: Record<string, QueryValue>;
  /** JSON request body. */
  body?: unknown;
  /** Sanctum token read from the session cookie. Never sent to the browser (INV-05). */
  token?: string;
}

/** A non-2xx API response in the INV-01 error envelope. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: Record<string, string[]>;

  constructor(message: string, status: number, code: string, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

function baseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error('API_BASE_URL is not set. Copy .env.example to .env.local and point it at the API.');
  }
  return url.replace(/\/+$/, '');
}

function buildPath(template: string, params: Record<string, string> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing path parameter "${key}" for ${template}`);
    }
    return encodeURIComponent(value);
  });
}

function buildQuery(query: Record<string, QueryValue> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    search.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Calls a registered API endpoint from the server and returns the parsed body.
 * Throws ApiError for any non-2xx response. Responses are never cached: every
 * page reads live data at request time.
 */
export async function apiFetch<T>(endpoint: EndpointName, options: ApiFetchOptions = {}): Promise<T> {
  const { method, path } = endpoints[endpoint];
  const url = `${baseUrl()}${buildPath(path, options.params)}${buildQuery(options.query)}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(url, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(
      error.message ?? response.statusText,
      response.status,
      error.code ?? 'http_error',
      error.errors ?? {},
    );
  }

  return payload as T;
}
