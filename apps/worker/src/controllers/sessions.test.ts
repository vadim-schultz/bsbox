import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app';
import type { Env } from '../env';
import { createMinutesRepo, createSessionsRepo } from '../repos';
import { seedSeries } from '../repos/testSeed';

const START = 1_800_000_000;

function get(path: string, now = START + 3600) {
  const e: Env = { ...env, SERIES_RATE_LIMITER: { limit: async () => ({ success: true }) } };
  return createApp({ now: () => now }).request(`https://bsbox.test${path}`, undefined, e);
}

async function seedEnded(code: string) {
  await seedSeries(env.DB, code, { startUtc: START });
  const sessions = createSessionsRepo(env.DB);
  const id = `${code}-${START}`;
  await sessions.upsertScheduled({ id, seriesCode: code, startTs: START, endTs: START + 1800 });
  await sessions.finalize(id, {
    peakParticipants: 3,
    participationRate: 1,
    raw: 0.5,
    score: 0.7,
    level: 'high',
    finalizedAt: START + 1800,
  });
  await createMinutesRepo(env.DB).insertMany(id, [{ minuteIdx: 0, present: 3, engaged: 2 }]);
  return id;
}

describe('sessions controller', () => {
  it('serves a finalized session with result and public cache, listed first in history', async () => {
    const id = await seedEnded('CTRRES0001');
    const res = await get(`/api/sessions/${id}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    const body = (await res.json()) as { result: { score: number; minutes: unknown[] } };
    expect(body.result.score).toBe(0.7);
    expect(body.result.minutes).toHaveLength(1);

    const list = (await (await get('/api/sessions?series=CTRRES0001')).json()) as {
      items: { id: string }[];
    };
    expect(list.items[0]?.id).toBe(id);
  });

  it('a live session has no result and no-store', async () => {
    await seedSeries(env.DB, 'CTRLIVE001', { startUtc: START });
    const id = `CTRLIVE001-${START}`;
    await createSessionsRepo(env.DB).upsertScheduled({
      id,
      seriesCode: 'CTRLIVE001',
      startTs: START,
      endTs: START + 1800,
    });
    const res = await get(`/api/sessions/${id}`, START + 60);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(((await res.json()) as { result?: unknown }).result).toBeUndefined();
  });

  it('unknown id is 404 problem+json; purged id is 410', async () => {
    const res = await get(`/api/sessions/NOSUCH0001-${START}`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
    expect(((await res.json()) as { code: string }).code).toBe('session_not_found');
    const gone = await get(`/api/sessions/NOSUCH0001-${START}`, START + 40 * 86_400);
    expect(gone.status).toBe(410);
  });

  it('limit=500 is 422 and a tampered cursor is 422 invalid_cursor', async () => {
    await seedSeries(env.DB, 'CTRBAD0001');
    expect((await get('/api/sessions?series=CTRBAD0001&limit=500')).status).toBe(422);
    const res = await get('/api/sessions?series=CTRBAD0001&cursor=garbage!');
    expect(res.status).toBe(422);
    expect(((await res.json()) as { code: string }).code).toBe('invalid_cursor');
  });
});
