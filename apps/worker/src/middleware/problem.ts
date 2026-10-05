import type { ProblemCode } from '@bsbox/shared';

/** Error carrying an RFC 9457 problem with a stable, client-translatable code. */
export class ProblemError extends Error {
  constructor(
    readonly status: number,
    readonly code: ProblemCode,
    readonly detail?: string,
  ) {
    super(detail ?? code);
    this.name = 'ProblemError';
  }
}

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  410: 'Gone',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

export function problemResponse(status: number, code: ProblemCode, detail?: string): Response {
  const body = { title: TITLES[status] ?? 'Error', status, code, ...(detail ? { detail } : {}) };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });
}

/** Hono `onError` handler: known problems keep their code; anything else is a 500. */
export function onProblem(err: Error): Response {
  if (err instanceof ProblemError) return problemResponse(err.status, err.code, err.detail);
  console.error(err);
  return problemResponse(500, 'internal_error');
}

export function notFoundProblem(): Response {
  return problemResponse(404, 'not_found');
}
