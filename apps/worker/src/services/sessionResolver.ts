import { currentOrNext } from '@bsbox/shared';
import type { Series } from '../repos';
import type { createSessionsRepo, Session } from '../repos';

export interface SessionInfo {
  id: string;
  state: 'scheduled' | 'live' | 'ended';
  start: number;
  end: number;
}

type SessionsRepo = ReturnType<typeof createSessionsRepo>;

function toInfo(s: Session, now: number): SessionInfo {
  const state =
    s.state === 'ended' ? 'ended' : s.startTs <= now && now < s.endTs ? 'live' : 'scheduled';
  return { id: s.id, state, start: s.startTs, end: s.endTs };
}

export function createSessionResolver(sessions: SessionsRepo) {
  return {
    /**
     * The running or next session, created lazily as `scheduled`. When the schedule has run out
     * the latest stored session is returned instead, or null if there never was one.
     */
    async resolve(series: Series, now: number): Promise<SessionInfo | null> {
      const slot = currentOrNext(
        {
          startUtc: series.startUtc,
          durationMin: series.durationMin,
          tz: series.tz,
          rrule: series.rrule,
        },
        now,
      );
      if (slot) {
        const row = await sessions.upsertScheduled({
          id: `${series.code}-${slot.start}`,
          seriesCode: series.code,
          startTs: slot.start,
          endTs: slot.end,
        });
        return toInfo(row, now);
      }
      const latest = await sessions.listBySeries(series.code, { limit: 1 });
      const row = latest.items[0];
      return row ? toInfo(row, now) : null;
    },
  };
}
