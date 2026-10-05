import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createSessionsRepo } from '../repos';
import { seedSeries } from '../repos/testSeed';
import { createSessionResolver } from './sessionResolver';

const START = 1_800_000_000;

describe('sessionResolver', () => {
  it('lazily creates a scheduled session for a future start', async () => {
    const s = await seedSeries(env.DB, 'RESOLVE001', { startUtc: START, durationMin: 30 });
    const info = await createSessionResolver(createSessionsRepo(env.DB)).resolve(s, START - 600);
    expect(info).toEqual({
      id: `RESOLVE001-${START}`,
      state: 'scheduled',
      start: START,
      end: START + 1800,
    });
    expect((await createSessionsRepo(env.DB).getById(info!.id))?.state).toBe('scheduled');
  });

  it('reports live inside the window', async () => {
    const s = await seedSeries(env.DB, 'RESOLVE002', { startUtc: START, durationMin: 30 });
    const info = await createSessionResolver(createSessionsRepo(env.DB)).resolve(s, START + 60);
    expect(info?.state).toBe('live');
  });

  it('returns null when the series has ended and has no sessions', async () => {
    const s = await seedSeries(env.DB, 'RESOLVE003', { startUtc: START, durationMin: 30 });
    const info = await createSessionResolver(createSessionsRepo(env.DB)).resolve(s, START + 99999);
    expect(info).toBeNull();
  });

  it('falls back to the latest stored session when the series has ended', async () => {
    const s = await seedSeries(env.DB, 'RESOLVE004', { startUtc: START, durationMin: 30 });
    const resolver = createSessionResolver(createSessionsRepo(env.DB));
    await resolver.resolve(s, START - 10);
    const info = await resolver.resolve(s, START + 99999);
    expect(info?.id).toBe(`RESOLVE004-${START}`);
  });
});
