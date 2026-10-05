import { createSeriesRepo, type NewSeries } from './seriesRepo';

export function seriesFixture(code: string, over: Partial<NewSeries> = {}): NewSeries {
  return {
    code,
    title: null,
    source: 'web',
    externalKey: null,
    tz: 'UTC',
    startUtc: 1_700_000_000,
    durationMin: 30,
    rrule: null,
    editTokenHash: 'hash',
    createdAt: 1_700_000_000,
    expiresAt: 1_800_000_000,
    ...over,
  };
}

export async function seedSeries(d1: D1Database, code: string, over: Partial<NewSeries> = {}) {
  return createSeriesRepo(d1).create(seriesFixture(code, over));
}
