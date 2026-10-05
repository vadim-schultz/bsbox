import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createMinutesRepo } from './minutesRepo';
import { createSessionsRepo } from './sessionsRepo';
import { seedSeries } from './testSeed';

const result = {
  peakParticipants: 12,
  participationRate: 0.75,
  raw: 0.5,
  score: 0.62,
  level: 'high' as const,
  finalizedAt: 1_700_004_000,
};

describe('sessionsRepo + minutesRepo', () => {
  it('finalizes a session and stores its minutes', async () => {
    await seedSeries(env.DB, 'FINAL00001');
    const sessions = createSessionsRepo(env.DB);
    const minutes = createMinutesRepo(env.DB);
    const id = 'FINAL00001-1700000000';
    await sessions.upsertScheduled({
      id,
      seriesCode: 'FINAL00001',
      startTs: 1_700_000_000,
      endTs: 1_700_001_800,
    });
    const done = await sessions.finalize(id, result);
    expect(done).toMatchObject({ state: 'ended', score: 0.62, level: 'high' });
    await minutes.insertMany(id, [
      { minuteIdx: 0, present: 5, engaged: 3 },
      { minuteIdx: 1, present: 6, engaged: 4 },
    ]);
    expect(await minutes.listBySession(id)).toEqual([
      { minuteIdx: 0, present: 5, engaged: 3 },
      { minuteIdx: 1, present: 6, engaged: 4 },
    ]);
    expect(await sessions.getById(id)).toEqual(done);
  });

  it('lists newest first with a working cursor', async () => {
    await seedSeries(env.DB, 'LIST000001');
    const sessions = createSessionsRepo(env.DB);
    for (let i = 0; i < 5; i++) {
      const startTs = 1_700_000_000 + i * 86_400;
      await sessions.upsertScheduled({
        id: `LIST000001-${startTs}`,
        seriesCode: 'LIST000001',
        startTs,
        endTs: startTs + 1800,
      });
    }
    const page1 = await sessions.listBySeries('LIST000001', { limit: 2 });
    expect(page1.items.map((s) => s.startTs)).toEqual([1_700_345_600, 1_700_259_200]);
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await sessions.listBySeries('LIST000001', { limit: 2, cursor: page1.nextCursor });
    expect(page2.items.map((s) => s.startTs)).toEqual([1_700_172_800, 1_700_086_400]);
    const page3 = await sessions.listBySeries('LIST000001', { limit: 2, cursor: page2.nextCursor });
    expect(page3.items.map((s) => s.startTs)).toEqual([1_700_000_000]);
    expect(page3.nextCursor).toBeNull();
  });

  it('upsertScheduled is idempotent and does not reset an ended session', async () => {
    await seedSeries(env.DB, 'IDEM000001');
    const sessions = createSessionsRepo(env.DB);
    const id = 'IDEM000001-1700000000';
    const input = { id, seriesCode: 'IDEM000001', startTs: 1_700_000_000, endTs: 1_700_001_800 };
    await sessions.upsertScheduled(input);
    await sessions.finalize(id, result);
    await sessions.upsertScheduled({ ...input, endTs: 1_700_003_600 });
    expect(await sessions.getById(id)).toMatchObject({ state: 'ended', score: 0.62 });
  });

  it('returns null for unknown ids and finalize of a missing session', async () => {
    const sessions = createSessionsRepo(env.DB);
    expect(await sessions.getById('nope')).toBeNull();
    expect(await sessions.finalize('nope', result)).toBeNull();
  });
});
