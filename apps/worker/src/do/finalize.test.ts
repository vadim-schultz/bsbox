import { finalScore, level, rawScore } from '@bsbox/shared';
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createMinutesRepo, createSessionsRepo } from '../repos';
import { seedSeries } from '../repos/testSeed';
import { finalizeSession } from './finalize';
import { END, SESSION_ID, START, withCtx } from './testKit';

async function seedSession() {
  await seedSeries(env.DB, 'ABCDEFGHJK', { startUtc: START });
  await createSessionsRepo(env.DB).upsertScheduled({
    id: SESSION_ID,
    seriesCode: 'ABCDEFGHJK',
    startTs: START,
    endTs: END,
  });
}

describe('finalizeSession', () => {
  it('writes D1 rows whose score equals finalScore of the recorded minutes', () =>
    withCtx('fin1', async ({ store }) => {
      await seedSession();
      store.ensureParticipant('a', START + 1);
      store.ensureParticipant('b', START + 1);
      store.recordVote('a', 0, 'engaged', START + 5);
      store.recordVote('b', 10, 'speaking', START + 605);

      const out = await finalizeSession({ store, d1: env.DB, now: END, openIds: ['a', 'b'] });

      const minutes = await createMinutesRepo(env.DB).listBySession(SESSION_ID);
      expect(minutes).toHaveLength(30);
      expect(out.result.minutes).toEqual(minutes);
      const raw = rawScore(minutes);
      expect(out.result.raw).toBe(raw);
      expect(out.result.peak).toBe(2);
      expect(out.result.score).toBe(finalScore(raw, 2));
      expect(out.result.level).toBe(level(out.result.score));
      expect(out.result.participationRate).toBe(1);
      const row = await createSessionsRepo(env.DB).getById(SESSION_ID);
      expect(row).toMatchObject({ state: 'ended', score: out.result.score, peakParticipants: 2 });
    }));

  it('is idempotent: a second run keeps one set of rows and the same score', () =>
    withCtx('fin2', async ({ store }) => {
      await seedSession();
      store.ensureParticipant('a', START + 1);
      store.recordVote('a', 0, 'engaged', START + 5);
      const first = await finalizeSession({ store, d1: env.DB, now: END, openIds: ['a'] });
      const second = await finalizeSession({ store, d1: env.DB, now: END + 50, openIds: [] });
      expect(first.fresh).toBe(true);
      expect(second.fresh).toBe(false);
      expect(second.result).toEqual(first.result);
      expect(await createMinutesRepo(env.DB).listBySession(SESSION_ID)).toHaveLength(30);
    }));

  it('finalizes an empty session as score 0, low, peak 0', () =>
    withCtx('fin3', async ({ store }) => {
      await seedSession();
      const { result } = await finalizeSession({ store, d1: env.DB, now: END, openIds: [] });
      expect(result).toMatchObject({
        score: 0,
        raw: 0,
        level: 'low',
        peak: 0,
        participationRate: 0,
      });
    }));
});
