import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { Env } from './env';
import { clockFor } from './testClock';

const REAL = () => 1_000;

describe('testClock', () => {
  it('honours ?now= when ENVIRONMENT is test', () => {
    const now = clockFor({ ENVIRONMENT: 'test' }, 'https://x.test/api/health?now=5000', REAL);
    expect(now()).toBe(5000);
  });

  it('ignores ?now= when ENVIRONMENT is production', () => {
    const now = clockFor({ ENVIRONMENT: 'production' }, 'https://x.test/api/health?now=5000', REAL);
    expect(now()).toBe(1_000);
  });

  it('ignores ?now= when ENVIRONMENT is unset or the value is not a positive integer', () => {
    expect(clockFor({}, 'https://x.test/?now=5000', REAL)()).toBe(1_000);
    expect(clockFor({ ENVIRONMENT: 'test' }, 'https://x.test/?now=abc', REAL)()).toBe(1_000);
    expect(clockFor({ ENVIRONMENT: 'test' }, 'https://x.test/?now=-4', REAL)()).toBe(1_000);
  });

  it('moves a series from scheduled to live through the app only in test mode', async () => {
    const start = Math.floor(Date.now() / 1000) + 7200;
    const body = JSON.stringify({ start, durationMin: 30, tz: 'Europe/Berlin', source: 'web' });
    const call = (e: Env, path: string, init?: RequestInit) =>
      createApp().request(`https://bsbox.test${path}`, init, e);
    const base: Env = { ...env, SERIES_RATE_LIMITER: { limit: async () => ({ success: true }) } };
    const created = (await (
      await call(base, '/api/series', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      })
    ).json()) as { code: string };
    const url = `/api/series/${created.code}?now=${start + 60}`;
    const state = async (e: Env) =>
      ((await (await call(e, url)).json()) as { session: { state: string } }).session.state;
    expect(await state({ ...base, ENVIRONMENT: 'test' })).toBe('live');
    expect(await state({ ...base, ENVIRONMENT: 'production' })).toBe('scheduled');
  });
});
