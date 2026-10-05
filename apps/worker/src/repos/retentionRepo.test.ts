import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createMinutesRepo } from './minutesRepo';
import { createRetentionRepo } from './retentionRepo';
import { createSeriesRepo } from './seriesRepo';
import { createSessionsRepo } from './sessionsRepo';
import { seedSeries } from './testSeed';

describe('retentionRepo.deleteExpired', () => {
  it('deletes only expired series and cascades sessions and minutes', async () => {
    const sessions = createSessionsRepo(env.DB);
    const minutes = createMinutesRepo(env.DB);
    await seedSeries(env.DB, 'EXPIRED001', { expiresAt: 1000 });
    await seedSeries(env.DB, 'LIVE000001', { expiresAt: 5000 });
    for (const code of ['EXPIRED001', 'LIVE000001']) {
      const id = `${code}-1`;
      await sessions.upsertScheduled({ id, seriesCode: code, startTs: 1, endTs: 2 });
      await minutes.insertMany(id, [{ minuteIdx: 0, present: 1, engaged: 1 }]);
    }

    const deleted = await createRetentionRepo(env.DB).deleteExpired(2000);

    expect(deleted).toBe(1);
    expect(await createSeriesRepo(env.DB).getByCode('EXPIRED001')).toBeNull();
    expect(await sessions.getById('EXPIRED001-1')).toBeNull();
    expect(await minutes.listBySession('EXPIRED001-1')).toEqual([]);
    expect(await createSeriesRepo(env.DB).getByCode('LIVE000001')).not.toBeNull();
    expect(await sessions.getById('LIVE000001-1')).not.toBeNull();
    expect(await minutes.listBySession('LIVE000001-1')).toHaveLength(1);
  });

  it('deletes nothing when no series has expired', async () => {
    await seedSeries(env.DB, 'KEEP000001', { expiresAt: 9_000_000_000 });
    expect(await createRetentionRepo(env.DB).deleteExpired(1)).toBe(0);
    expect(await createSeriesRepo(env.DB).getByCode('KEEP000001')).not.toBeNull();
  });
});
