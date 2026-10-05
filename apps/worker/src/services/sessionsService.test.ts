import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createMinutesRepo, createSeriesRepo, createSessionsRepo } from '../repos';
import { seedSeries } from '../repos/testSeed';
import { createSessionsService } from './sessionsService';

const START = 1_800_000_000;
const DAY = 86_400;

function service(now: number) {
  return createSessionsService({
    series: createSeriesRepo(env.DB),
    sessions: createSessionsRepo(env.DB),
    minutes: createMinutesRepo(env.DB),
    now: () => now,
  });
}

async function seedEnded(code: string, start = START) {
  await seedSeries(env.DB, code, { startUtc: start });
  const sessions = createSessionsRepo(env.DB);
  const id = `${code}-${start}`;
  await sessions.upsertScheduled({ id, seriesCode: code, startTs: start, endTs: start + 1800 });
  await sessions.finalize(id, {
    peakParticipants: 4,
    participationRate: 0.5,
    raw: 0.4,
    score: 0.55,
    level: 'healthy',
    finalizedAt: start + 1800,
  });
  await createMinutesRepo(env.DB).insertMany(id, [{ minuteIdx: 0, present: 4, engaged: 2 }]);
  return id;
}

describe('sessionsService', () => {
  it('returns the stored result with minutes for an ended session, cacheable', async () => {
    const id = await seedEnded('SVCRES0001');
    const { body, cacheable } = await service(START + 3600).get(id);
    expect(cacheable).toBe(true);
    expect(body.result).toEqual({
      score: 0.55,
      level: 'healthy',
      raw: 0.4,
      peak: 4,
      participationRate: 0.5,
      minutes: [{ minuteIdx: 0, present: 4, engaged: 2 }],
    });
  });

  it('a live session has no result and is not cacheable', async () => {
    await seedSeries(env.DB, 'SVCLIVE001', { startUtc: START });
    const id = `SVCLIVE001-${START}`;
    await createSessionsRepo(env.DB).upsertScheduled({
      id,
      seriesCode: 'SVCLIVE001',
      startTs: START,
      endTs: START + 1800,
    });
    const { body, cacheable } = await service(START + 60).get(id);
    expect(body.state).toBe('live');
    expect(body.result).toBeUndefined();
    expect(cacheable).toBe(false);
  });

  it('lists newest first and pages with an opaque cursor', async () => {
    await seedSeries(env.DB, 'SVCLIST001');
    const sessions = createSessionsRepo(env.DB);
    for (const n of [1, 2, 3]) {
      const s = START + n * DAY;
      await sessions.upsertScheduled({
        id: `SVCLIST001-${s}`,
        seriesCode: 'SVCLIST001',
        startTs: s,
        endTs: s + 1800,
      });
    }
    const svc = service(START);
    const first = await svc.list('SVCLIST001', '2', undefined);
    expect(first.items.map((i) => i.start)).toEqual([START + 3 * DAY, START + 2 * DAY]);
    expect(first.nextCursor).not.toBeNull();
    const second = await svc.list('SVCLIST001', '2', first.nextCursor!);
    expect(second.items.map((i) => i.start)).toEqual([START + DAY]);
    expect(second.nextCursor).toBeNull();
  });

  it('404 for an unknown recent id, 410 for one past retention', async () => {
    await expect(service(START).get(`NOSUCH0001-${START}`)).rejects.toMatchObject({
      status: 404,
      code: 'session_not_found',
    });
    await expect(service(START + 31 * DAY).get(`NOSUCH0001-${START}`)).rejects.toMatchObject({
      status: 410,
      code: 'session_expired',
    });
  });

  it('410 for a stored session past retention', async () => {
    const id = await seedEnded('SVCOLD0001');
    await expect(service(START + 31 * DAY).get(id)).rejects.toMatchObject({ status: 410 });
  });

  it('rejects limit above 50 and tampered cursors', async () => {
    await seedSeries(env.DB, 'SVCBAD0001');
    const svc = service(START);
    await expect(svc.list('SVCBAD0001', '500', undefined)).rejects.toMatchObject({ status: 422 });
    await expect(svc.list('SVCBAD0001', undefined, '%%%tampered')).rejects.toMatchObject({
      status: 422,
      code: 'invalid_cursor',
    });
    await expect(svc.list('SVCBAD0001', undefined, btoa('c1:abc'))).rejects.toMatchObject({
      code: 'invalid_cursor',
    });
  });
});
