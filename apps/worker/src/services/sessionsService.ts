import type { SessionResponse } from '@bsbox/shared';
import { ProblemError } from '../middleware/problem';
import type { createMinutesRepo, createSeriesRepo, createSessionsRepo, Session } from '../repos';

const RETENTION_S = 30 * 86_400;
export const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const CURSOR_PREFIX = 'c1:';

export interface SessionsServiceDeps {
  series: ReturnType<typeof createSeriesRepo>;
  sessions: ReturnType<typeof createSessionsRepo>;
  minutes: ReturnType<typeof createMinutesRepo>;
  now?: () => number;
}

export interface SessionDetail {
  body: SessionResponse;
  /** Ended results are immutable and cacheable; everything else must not be cached. */
  cacheable: boolean;
}

export interface SessionList {
  items: SessionResponse[];
  nextCursor: string | null;
}

function encodeCursor(raw: string): string {
  return btoa(`${CURSOR_PREFIX}${raw}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeCursor(cursor: string): string {
  const bad = new ProblemError(422, 'invalid_cursor');
  try {
    const padded = cursor.replace(/-/g, '+').replace(/_/g, '/');
    const text = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const raw = text.slice(CURSOR_PREFIX.length);
    if (!text.startsWith(CURSOR_PREFIX) || !/^\d+$/.test(raw)) throw bad;
    return raw;
  } catch {
    throw bad;
  }
}

function phase(s: Session, now: number): SessionResponse['state'] {
  if (s.state === 'ended') return 'ended';
  return s.startTs <= now && now < s.endTs ? 'live' : 'scheduled';
}

function summary(s: Session, now: number): SessionResponse {
  return {
    id: s.id,
    series: s.seriesCode,
    state: phase(s, now),
    start: s.startTs,
    end: s.endTs,
  };
}

/** Session ids are `<code>-<start_epoch>`; a purged row can still be told apart by its age. */
function startFromId(id: string): number | null {
  const m = /-(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
}

export function createSessionsService(deps: SessionsServiceDeps) {
  const now = deps.now ?? (() => Math.floor(Date.now() / 1000));

  function missing(id: string): ProblemError {
    const start = startFromId(id);
    return start !== null && start + RETENTION_S < now()
      ? new ProblemError(410, 'session_expired')
      : new ProblemError(404, 'session_not_found');
  }

  return {
    async list(
      seriesCode: string | undefined,
      limitParam: string | undefined,
      cursor: string | undefined,
    ): Promise<SessionList> {
      if (!seriesCode) throw new ProblemError(422, 'validation_failed', 'series is required');
      const limit = limitParam === undefined ? DEFAULT_LIMIT : Number(limitParam);
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
        throw new ProblemError(422, 'validation_failed', `limit must be 1..${MAX_LIMIT}`);
      }
      const decoded = cursor ? decodeCursor(cursor) : null;
      if (!(await deps.series.getByCode(seriesCode))) {
        throw new ProblemError(404, 'series_not_found');
      }
      const page = await deps.sessions.listBySeries(seriesCode, { limit, cursor: decoded });
      const t = now();
      return {
        items: page.items.map((s) => summary(s, t)),
        nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
      };
    },

    async get(id: string): Promise<SessionDetail> {
      const row = await deps.sessions.getById(id);
      if (!row) throw missing(id);
      const t = now();
      if (row.endTs + RETENTION_S < t) throw new ProblemError(410, 'session_expired');
      const body = summary(row, t);
      if (body.state !== 'ended' || row.score === null || row.level === null) {
        return { body, cacheable: false };
      }
      const minutes = await deps.minutes.listBySession(id);
      body.result = {
        score: row.score,
        level: row.level,
        raw: row.raw ?? 0,
        peak: row.peakParticipants ?? 0,
        participationRate: row.participationRate ?? 0,
        minutes,
      };
      return { body, cacheable: true };
    },
  };
}

export type SessionsService = ReturnType<typeof createSessionsService>;
