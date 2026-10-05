import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { Conflict } from './errors';
import { createSeriesRepo, type NewSeries } from './seriesRepo';

const base = (over: Partial<NewSeries> = {}): NewSeries => ({
  code: 'ABCDEFGHJK',
  title: 'Weekly',
  source: 'teams',
  externalKey: 'teams:abc',
  tz: 'Europe/Berlin',
  startUtc: 1_700_000_000,
  durationMin: 30,
  rrule: null,
  editTokenHash: 'hash',
  createdAt: 1_700_000_000,
  expiresAt: 1_800_000_000,
  ...over,
});

describe('seriesRepo', () => {
  it('creates a series and finds it by code and external key', async () => {
    const repo = createSeriesRepo(env.DB);
    const created = await repo.create(base({ code: 'HAPPY00001', externalKey: 'teams:happy' }));
    expect((await repo.getByCode('HAPPY00001'))?.title).toBe('Weekly');
    expect(await repo.getByExternalKey('teams:happy')).toEqual(created);
    expect(await repo.getByCode('NOPE000000')).toBeNull();
  });

  it('updates schedule fields', async () => {
    const repo = createSeriesRepo(env.DB);
    await repo.create(base({ code: 'UPDATE0001', externalKey: null }));
    const updated = await repo.update('UPDATE0001', { durationMin: 60, rrule: 'FREQ=DAILY' });
    expect(updated?.durationMin).toBe(60);
    expect(updated?.rrule).toBe('FREQ=DAILY');
  });

  it('rejects a duplicate external_key with a typed Conflict', async () => {
    const repo = createSeriesRepo(env.DB);
    await repo.create(base({ code: 'DUPE000001', externalKey: 'teams:dupe' }));
    await expect(
      repo.create(base({ code: 'DUPE000002', externalKey: 'teams:dupe' })),
    ).rejects.toBeInstanceOf(Conflict);
  });

  it('rejects a duplicate code with Conflict', async () => {
    const repo = createSeriesRepo(env.DB);
    await repo.create(base({ code: 'DUPE000003', externalKey: null }));
    await expect(
      repo.create(base({ code: 'DUPE000003', externalKey: null })),
    ).rejects.toBeInstanceOf(Conflict);
  });
});
