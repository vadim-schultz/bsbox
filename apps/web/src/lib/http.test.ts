import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, http } from './http';

const json = (body: unknown, status: number, type = 'application/json') =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': type } });

afterEach(() => vi.unstubAllGlobals());

describe('http', () => {
  it('returns parsed JSON on 200', async () => {
    const f = vi.fn().mockResolvedValue(json({ ok: true }, 200));
    vi.stubGlobal('fetch', f);
    const out = await http('/api/health', { schema: z.object({ ok: z.boolean() }) });
    expect(out).toEqual({ ok: true });
    expect(f).toHaveBeenCalledWith('/api/health', expect.objectContaining({ method: 'GET' }));
  });

  it('turns a 404 problem+json into ApiError with the server code', async () => {
    const problem = { title: 'Not found', status: 404, code: 'series_not_found' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json(problem, 404, 'application/problem+json')),
    );
    const err = await http('/api/series/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('series_not_found');
    expect((err as ApiError).status).toBe(404);
  });

  it('falls back to internal_error for a non-problem failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })));
    const err = (await http('/api/x').catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe('internal_error');
  });
});
