import { finalScore, level, rawScore, type SessionResult, type VoteStatus } from '@bsbox/shared';
import { createMinutesRepo, createSessionsRepo } from '../repos';
import { PRESENCE_WINDOW_SEC, type Participant, type SessionMeta, type Store } from './store';

interface Vote {
  participantId: string;
  minuteIdx: number;
  status: VoteStatus;
}

const isEngaged = (s: VoteStatus) => s === 'speaking' || s === 'engaged';

/** Last minute index (exclusive of the end) a participant counted as present until, in seconds. */
function presentUntil(p: Participant, end: number, open: ReadonlySet<string>): number {
  if (p.leftAt !== null) return p.leftAt;
  return open.has(p.id) ? end : p.lastSeenAt + PRESENCE_WINDOW_SEC;
}

/** Pure: per-minute presence and carried-forward engagement, then the shared scoring. */
export function computeResult(
  session: Pick<SessionMeta, 'start' | 'end'>,
  participants: readonly Participant[],
  votes: readonly Vote[],
  openIds: readonly string[],
): SessionResult {
  const count = Math.max(0, Math.ceil((session.end - session.start) / 60));
  const open = new Set(openIds);
  const byPid = new Map<string, Map<number, VoteStatus>>();
  for (const v of votes) {
    byPid.set(
      v.participantId,
      (byPid.get(v.participantId) ?? new Map()).set(v.minuteIdx, v.status),
    );
  }
  const present = new Array<number>(count).fill(0);
  const engaged = new Array<number>(count).fill(0);
  for (const p of participants) {
    const until = presentUntil(p, session.end, open);
    const mine = byPid.get(p.id);
    let carried: VoteStatus = 'disengaged';
    for (let m = 0; m < count; m += 1) {
      carried = mine?.get(m) ?? carried;
      const from = session.start + m * 60;
      if (!(p.joinedAt < from + 60 && until > from)) continue;
      present[m] = (present[m] ?? 0) + 1;
      if (isEngaged(carried)) engaged[m] = (engaged[m] ?? 0) + 1;
    }
  }
  const minutes = present.map((n, minuteIdx) => ({
    minuteIdx,
    present: n,
    engaged: engaged[minuteIdx] ?? 0,
  }));
  const peak = Math.max(0, ...present);
  const raw = rawScore(minutes);
  const score = peak < 1 ? 0 : finalScore(raw, peak);
  const voters = participants.filter((p) => p.voted).length;
  return {
    score,
    level: level(score),
    raw,
    peak,
    participationRate: participants.length === 0 ? 0 : voters / participants.length,
    minutes,
  };
}

export interface FinalizeInput {
  store: Store;
  d1: D1Database;
  now: number;
  openIds: readonly string[];
}

/**
 * Compute once, write D1, then remember the result. Idempotent: a repeat returns the stored
 * result with `fresh: false`. D1 writes are themselves idempotent, so a crash before the
 * result is remembered can safely retry.
 */
export async function finalizeSession(
  input: FinalizeInput,
): Promise<{ result: SessionResult; fresh: boolean }> {
  const { store, d1, now } = input;
  const stored = store.getResult();
  if (stored) return { result: stored.result, fresh: false };
  const session = store.getSession();
  if (!session) throw new Error('finalize: no session');
  const result = computeResult(session, store.listParticipants(), store.allVotes(), input.openIds);
  await createMinutesRepo(d1).insertMany(session.sessionId, result.minutes);
  await createSessionsRepo(d1).finalize(session.sessionId, {
    peakParticipants: result.peak,
    participationRate: result.participationRate,
    raw: result.raw,
    score: result.score,
    level: result.level,
    finalizedAt: now,
  });
  store.saveResult(result, now);
  store.saveSession({ ...session, phase: 'ended' });
  return { result, fresh: true };
}
