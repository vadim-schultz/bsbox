import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createSeriesRepo, createSessionsRepo } from '../repos';
import { ProblemError } from '../middleware/problem';
import { createSeriesService } from './seriesService';

const START = 1_800_000_000;
const NOW = START - 3600;
const body = { start: START, durationMin: 30, tz: 'Europe/Berlin', source: 'web' as const };

function service(now = NOW) {
  return createSeriesService({
    series: createSeriesRepo(env.DB),
    sessions: createSessionsRepo(env.DB),
    now: () => now,
  });
}

async function problem(p: Promise<unknown>): Promise<ProblemError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ProblemError) return e;
    throw e;
  }
  throw new Error('expected rejection');
}

describe('seriesService', () => {
  it('creates a series with a token and expiry 30 days after the single start', async () => {
    const r = await service().create(body);
    expect(r.created).toBe(true);
    expect(r.code).toHaveLength(10);
    expect(r.editToken).toBeTruthy();
    const row = await createSeriesRepo(env.DB).getByCode(r.code);
    expect(row?.expiresAt).toBe(START + 30 * 86400);
    expect(row?.editTokenHash).not.toBe(r.editToken);
  });

  it('expires 30 days after the last occurrence of a bounded RRULE', async () => {
    const r = await service().create({ ...body, rrule: 'FREQ=DAILY;COUNT=3', tz: 'UTC' });
    const row = await createSeriesRepo(env.DB).getByCode(r.code);
    expect(row?.expiresAt).toBe(START + 2 * 86400 + 30 * 86400);
  });

  it('is idempotent on externalKey and returns no token the second time', async () => {
    const a = await service().create({ ...body, externalKey: 'teams:svc1' });
    const b = await service().create({ ...body, externalKey: 'teams:svc1' });
    expect(b.created).toBe(false);
    expect(b.code).toBe(a.code);
    expect(b.editToken).toBeUndefined();
  });

  it('rejects an invalid timezone and a malformed RRULE with validation_failed', async () => {
    const tz = await problem(service().create({ ...body, tz: 'Mars/Base' }));
    expect(tz.code).toBe('validation_failed');
    const rr = await problem(service().create({ ...body, rrule: 'NOT-A-RULE' }));
    expect(rr.code).toBe('validation_failed');
  });

  it('get returns series_not_found for an unknown code', async () => {
    const e = await problem(service().get('ZZZZZZZZZZ'));
    expect(e).toMatchObject({ status: 404, code: 'series_not_found' });
  });

  it('get returns schedule, session and serverTime', async () => {
    const r = await service().create({ ...body, title: 'Weekly' });
    const got = await service().get(r.code);
    expect(got).toMatchObject({
      code: r.code,
      title: 'Weekly',
      schedule: { tz: 'Europe/Berlin', start: START, durationMin: 30, rrule: null },
      session: { state: 'scheduled', start: START, end: START + 1800 },
      serverTime: NOW,
    });
  });

  it('patch requires the correct token', async () => {
    const r = await service().create(body);
    const missing = await problem(service().patch(r.code, undefined, { durationMin: 45 }));
    expect(missing).toMatchObject({ status: 401, code: 'missing_edit_token' });
    const wrong = await problem(service().patch(r.code, 'nope', { durationMin: 45 }));
    expect(wrong).toMatchObject({ status: 403, code: 'invalid_edit_token' });
    const ok = await service().patch(r.code, r.editToken, { durationMin: 45 });
    expect(ok.schedule.durationMin).toBe(45);
  });

  it('patch on an unknown code is series_not_found', async () => {
    const e = await problem(service().patch('ZZZZZZZZZZ', 'x', { durationMin: 45 }));
    expect(e.code).toBe('series_not_found');
  });

  it('patch validates the merged schedule', async () => {
    const r = await service().create(body);
    const e = await problem(service().patch(r.code, r.editToken, { tz: 'Mars/Base' }));
    expect(e.code).toBe('validation_failed');
  });
});
