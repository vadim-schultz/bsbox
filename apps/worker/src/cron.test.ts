import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { scheduled } from './cron';
import { createSeriesRepo } from './repos';
import { seedSeries } from './repos/testSeed';

describe('retention cron', () => {
  it('deletes expired series and keeps live ones', async () => {
    await seedSeries(env.DB, 'CRONOLD001', { expiresAt: 1000 });
    await seedSeries(env.DB, 'CRONNEW001', { expiresAt: 9_000_000_000 });
    await scheduled({} as ScheduledController, env);
    expect(await createSeriesRepo(env.DB).getByCode('CRONOLD001')).toBeNull();
    expect(await createSeriesRepo(env.DB).getByCode('CRONNEW001')).not.toBeNull();
  });

  it('is a no-op when nothing has expired', async () => {
    await seedSeries(env.DB, 'CRONKEEP01', { expiresAt: 9_000_000_000 });
    await expect(scheduled({} as ScheduledController, env)).resolves.toBeUndefined();
    expect(await createSeriesRepo(env.DB).getByCode('CRONKEEP01')).not.toBeNull();
  });
});
