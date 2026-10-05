import { problemSchema, type ProblemCode } from '@bsbox/shared';
import type { ZodType } from 'zod';

export class ApiError extends Error {
  constructor(
    readonly code: ProblemCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface HttpOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  schema?: ZodType<T>;
  signal?: AbortSignal;
}

async function toApiError(res: Response): Promise<ApiError> {
  const parsed = problemSchema.safeParse(await res.json().catch(() => null));
  if (parsed.success) return new ApiError(parsed.data.code, res.status, parsed.data.title);
  return new ApiError('internal_error', res.status, res.statusText || 'Request failed');
}

/** Typed fetch. Failures become ApiError carrying the server's problem+json `code`. */
export async function http<T = unknown>(path: string, options: HttpOptions<T> = {}): Promise<T> {
  const { method = 'GET', body, headers, schema, signal } = options;
  const res = await fetch(path, {
    method,
    signal,
    headers: {
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res);
  const data: unknown = res.status === 204 ? undefined : await res.json();
  return schema ? schema.parse(data) : (data as T);
}
