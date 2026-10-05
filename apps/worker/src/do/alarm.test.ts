import type { ServerMessage } from '@bsbox/shared';
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createSessionsRepo } from '../repos';
import { seedSeries } from '../repos/testSeed';
import { nextAlarmAt, runAlarm, TICK_INTERVAL_SEC, PURGE_DELAY_SEC, type AlarmDeps } from './alarm';
import { handleFrame } from './handlers';
import type { Store } from './store';
import { END, SESSION_ID, START, withCtx } from './testKit';

function fakeDeps(store: Store, clock: { t: number }) {
  const sent: ServerMessage[] = [];
  const log = { closed: 0, purged: 0, alarms: [] as (number | null)[] };
  const deps: AlarmDeps = {
    store,
    d1: env.DB,
    now: () => clock.t,
    openIds: () => [],
    broadcast: (m) => sent.push(m),
    closeAll: () => void (log.closed += 1),
    purge: async () => void (log.purged += 1),
    setAlarm: (at) => void log.alarms.push(at),
  };
  return { deps, sent, log };
}

describe('nextAlarmAt', () => {
  const base = { start: 1000, end: 2800, ended: false, dirty: false };
  it('targets start, then end, ticking only when dirty, then purge', () => {
    expect(nextAlarmAt({ ...base, now: 10 })).toBe(1000);
    expect(nextAlarmAt({ ...base, now: 1100 })).toBe(2800);
    expect(nextAlarmAt({ ...base, now: 1100, dirty: true })).toBe(1100 + TICK_INTERVAL_SEC);
    expect(nextAlarmAt({ ...base, now: 2790, dirty: true })).toBe(2795);
    expect(nextAlarmAt({ ...base, now: 2799, dirty: true })).toBe(2800);
    expect(nextAlarmAt({ ...base, now: 2900, ended: true })).toBe(2800 + PURGE_DELAY_SEC);
    expect(nextAlarmAt({ ...base, now: 2800 + PURGE_DELAY_SEC + 1, ended: true })).toBeNull();
  });
});

describe('runAlarm', () => {
  it('announces live, sends one coalesced tick, then ends with the result', () =>
    withCtx('al1', async ({ store }, clock) => {
      await seedSeries(env.DB, 'ABCDEFGHJK', { startUtc: START });
      await createSessionsRepo(env.DB).upsertScheduled({
        id: SESSION_ID,
        seriesCode: 'ABCDEFGHJK',
        startTs: START,
        endTs: END,
      });
      const { deps, sent, log } = fakeDeps(store, clock);

      clock.t = START;
      await runAlarm(deps);
      expect(sent).toEqual([{ type: 'phase', state: 'live', at: START }]);

      store.ensureParticipant('a', START + 5);
      store.recordVote('a', 0, 'engaged', START + 5);
      store.recordVote('a', 0, 'speaking', START + 6);
      store.markDirty();
      clock.t = START + 10;
      await runAlarm(deps);
      const ticks = sent.filter((m) => m.type === 'tick');
      expect(ticks).toEqual([{ type: 'tick', minuteIdx: 0, present: 1, engaged: 1, speaking: 1 }]);

      clock.t = END;
      sent.length = 0;
      await runAlarm(deps);
      expect(sent.map((m) => m.type)).toEqual(['phase', 'ended']);
      expect(log.closed).toBe(1);
      expect(log.alarms.at(-1)).toBe(END + PURGE_DELAY_SEC);
    }));

  it('sends no tick when nothing changed, and nothing on a repeated end alarm', () =>
    withCtx('al2', async ({ store }, clock) => {
      await seedSeries(env.DB, 'ABCDEFGHJK', { startUtc: START });
      await createSessionsRepo(env.DB).upsertScheduled({
        id: SESSION_ID,
        seriesCode: 'ABCDEFGHJK',
        startTs: START,
        endTs: END,
      });
      const { deps, sent, log } = fakeDeps(store, clock);
      clock.t = START + 20;
      await runAlarm(deps);
      clock.t = START + 30;
      await runAlarm(deps);
      expect(sent.filter((m) => m.type === 'tick')).toEqual([]);

      clock.t = END;
      await runAlarm(deps);
      const count = sent.length;
      await runAlarm(deps);
      expect(sent).toHaveLength(count);
      expect(log.closed).toBe(1);
    }));

  it('purges storage once the purge time has passed', () =>
    withCtx('al3', async ({ store }, clock) => {
      await seedSeries(env.DB, 'ABCDEFGHJK', { startUtc: START });
      await createSessionsRepo(env.DB).upsertScheduled({
        id: SESSION_ID,
        seriesCode: 'ABCDEFGHJK',
        startTs: START,
        endTs: END,
      });
      const { deps, log } = fakeDeps(store, clock);
      clock.t = END;
      await runAlarm(deps);
      expect(log.purged).toBe(0);
      clock.t = END + PURGE_DELAY_SEC;
      await runAlarm(deps);
      expect(log.purged).toBe(1);
    }));
});

describe('late joiner', () => {
  it('receives phase ended and the same result right after welcome', () =>
    withCtx('al4', async (ctx, clock) => {
      await seedSeries(env.DB, 'ABCDEFGHJK', { startUtc: START });
      await createSessionsRepo(env.DB).upsertScheduled({
        id: SESSION_ID,
        seriesCode: 'ABCDEFGHJK',
        startTs: START,
        endTs: END,
      });
      const { deps, sent } = fakeDeps(ctx.store, clock);
      clock.t = END;
      await runAlarm(deps);
      const ended = sent.find((m) => m.type === 'ended');

      const res = await handleFrame(ctx, undefined, '{"type":"hello"}');
      expect(res.replies.map((m) => m.type)).toEqual(['welcome', 'phase', 'ended']);
      expect(res.replies[2]).toEqual(ended);
    }));
});
