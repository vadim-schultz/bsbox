import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import type { Env } from '../env';

const START = Math.floor(Date.now() / 1000) + 7200;
const valid = { start: START, durationMin: 30, tz: 'Europe/Berlin', source: 'web' };

function app(limiter?: RateLimit, now?: () => number) {
  const e: Env = {
    ...env,
    SERIES_RATE_LIMITER: limiter ?? { limit: async () => ({ success: true }) },
  };
  const a = createApp(now ? { now } : {});
  return (path: string, init?: RequestInit) => a.request(`https://bsbox.test${path}`, init, e);
}

const post = (b: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(b),
});

describe('series controller', () => {
  it('POST returns 201 with code, joinUrl and token; GET returns scheduled then live', async () => {
    const res = await app()('/api/series', post(valid));
    expect(res.status).toBe(201);
    const created = (await res.json()) as { code: string; joinUrl: string; editToken: string };
    expect(created.joinUrl).toBe(`https://bsbox.test/m/${created.code}`);
    expect(created.editToken).toBeTruthy();

    const before = await app()(`/api/series/${created.code}`);
    expect(((await before.json()) as { session: { state: string } }).session.state).toBe(
      'scheduled',
    );
    const inside = await app(undefined, () => START + 60)(`/api/series/${created.code}`);
    expect(((await inside.json()) as { session: { state: string } }).session.state).toBe('live');
  });

  it('repeat POST with the same externalKey returns 200, same code, no token', async () => {
    const b = { ...valid, externalKey: 'teams:ctrl1' };
    const first = (await (await app()('/api/series', post(b))).json()) as { code: string };
    const res = await app()('/api/series', post(b));
    expect(res.status).toBe(200);
    const second = (await res.json()) as { code: string; editToken?: string };
    expect(second.code).toBe(first.code);
    expect(second.editToken).toBeUndefined();
  });

  it('PATCH without a token is 401, with a wrong token 403', async () => {
    const c = (await (await app()('/api/series', post(valid))).json()) as { code: string };
    const patch = (headers: Record<string, string>): RequestInit => ({
      method: 'PATCH',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ durationMin: 45 }),
    });
    const none = await app()(`/api/series/${c.code}`, patch({}));
    expect(none.status).toBe(401);
    expect(((await none.json()) as { code: string }).code).toBe('missing_edit_token');
    const bad = await app()(`/api/series/${c.code}`, patch({ 'X-Edit-Token': 'wrong' }));
    expect(bad.status).toBe(403);
    expect(((await bad.json()) as { code: string }).code).toBe('invalid_edit_token');
  });

  it.each([
    ['duration 4 min', { ...valid, durationMin: 4 }],
    ['bad tz', { ...valid, tz: 'Nope/Zone' }],
    ['bad rrule', { ...valid, rrule: 'garbage' }],
  ])('rejects %s with 422 problem+json', async (_n, b) => {
    const res = await app()('/api/series', post(b));
    expect(res.status).toBe(422);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    expect(((await res.json()) as { code: string }).code).toBe('validation_failed');
  });

  it('rejects malformed JSON with 400 bad_request', async () => {
    const res = await app()('/api/series', { method: 'POST', body: '{nope' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe('bad_request');
  });

  it('unknown code is 404 series_not_found', async () => {
    const res = await app()('/api/series/ZZZZZZZZZZ');
    expect(res.status).toBe(404);
    expect(((await res.json()) as { code: string }).code).toBe('series_not_found');
  });

  it('returns 429 once the limiter rejects', async () => {
    let n = 0;
    const limiter: RateLimit = { limit: async () => ({ success: ++n <= 10 }) };
    const call = app(limiter);
    for (let i = 0; i < 10; i++) expect((await call('/api/series', post(valid))).status).toBe(201);
    const res = await call('/api/series', post(valid));
    expect(res.status).toBe(429);
    expect(((await res.json()) as { code: string }).code).toBe('rate_limited');
  });

  it('GET /api/health is ok', async () => {
    const res = await app()('/api/health');
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('the real rate limit binding rejects the 11th create in a minute from one IP', async () => {
    const call = app(env.SERIES_RATE_LIMITER);
    const ip = { 'cf-connecting-ip': '203.0.113.9' };
    for (let i = 0; i < 10; i++) {
      expect((await call('/api/series', post(valid, ip))).status).toBe(201);
    }
    expect((await call('/api/series', post(valid, ip))).status).toBe(429);
  });
});
