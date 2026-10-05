import type { SessionResult, VoteStatus } from '@bsbox/shared';

export interface Participant {
  id: string;
  joinedAt: number;
  lastSeenAt: number;
  leftAt: number | null;
  lastStatus: VoteStatus;
  voted: boolean;
}

export interface SessionMeta {
  sessionId: string;
  start: number;
  end: number;
  /** `ended` once finalized (chapter 07); otherwise the phase follows the clock. */
  phase: 'open' | 'ended';
}

export const PRESENCE_WINDOW_SEC = 60;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS participants (
     id TEXT PRIMARY KEY, joined_at INTEGER NOT NULL, last_seen_at INTEGER NOT NULL,
     left_at INTEGER, last_status TEXT NOT NULL DEFAULT 'disengaged', voted INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS votes (
     participant_id TEXT NOT NULL, minute_idx INTEGER NOT NULL, status TEXT NOT NULL,
     PRIMARY KEY (participant_id, minute_idx))`,
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
];

type Row = Record<string, SqlStorageValue>;

function toParticipant(r: Row): Participant {
  return {
    id: r.id as string,
    joinedAt: r.joined_at as number,
    lastSeenAt: r.last_seen_at as number,
    leftAt: (r.left_at as number | null) ?? null,
    lastStatus: r.last_status as VoteStatus,
    voted: r.voted === 1,
  };
}

/** All SQL for the per-session Durable Object lives here. */
export function createStore(sql: SqlStorage) {
  for (const stmt of SCHEMA) sql.exec(stmt);
  const rows = (q: string, ...b: SqlStorageValue[]) => sql.exec<Row>(q, ...b).toArray();
  return {
    setMeta(key: string, value: string): void {
      sql.exec('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
    },
    getMeta(key: string): string | null {
      return (rows('SELECT value FROM meta WHERE key = ?', key)[0]?.value as string) ?? null;
    },
    getSession(): SessionMeta | null {
      const raw = this.getMeta('session');
      return raw ? (JSON.parse(raw) as SessionMeta) : null;
    },
    saveSession(meta: SessionMeta): void {
      this.setMeta('session', JSON.stringify(meta));
    },
    listParticipants(): Participant[] {
      return rows('SELECT * FROM participants').map(toParticipant);
    },
    allVotes(): { participantId: string; minuteIdx: number; status: VoteStatus }[] {
      return rows('SELECT participant_id, minute_idx, status FROM votes').map((r) => ({
        participantId: r.participant_id as string,
        minuteIdx: r.minute_idx as number,
        status: r.status as VoteStatus,
      }));
    },
    /** Set when a vote or presence change happened since the last tick. */
    markDirty(): void {
      this.setMeta('dirty', '1');
    },
    isDirty(): boolean {
      return this.getMeta('dirty') === '1';
    },
    clearDirty(): void {
      this.setMeta('dirty', '0');
    },
    getResult(): { result: SessionResult; finalizedAt: number } | null {
      const raw = this.getMeta('result');
      return raw ? (JSON.parse(raw) as { result: SessionResult; finalizedAt: number }) : null;
    },
    saveResult(result: SessionResult, finalizedAt: number): void {
      this.setMeta('result', JSON.stringify({ result, finalizedAt }));
    },
    /** Delete all hot-path data (purge, 24 h after finalize). */
    clearAll(): void {
      for (const t of ['participants', 'votes', 'meta']) sql.exec(`DELETE FROM ${t}`);
    },
    getParticipant(id: string): Participant | null {
      const r = rows('SELECT * FROM participants WHERE id = ?', id)[0];
      return r ? toParticipant(r) : null;
    },
    /** Insert a participant, or mark an existing one as seen again. */
    ensureParticipant(id: string, now: number): Participant {
      sql.exec(
        `INSERT INTO participants (id, joined_at, last_seen_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at, left_at = NULL`,
        id,
        now,
        now,
      );
      return this.getParticipant(id)!;
    },
    touch(id: string, now: number): void {
      sql.exec('UPDATE participants SET last_seen_at = ? WHERE id = ?', now, id);
    },
    markLeft(id: string, now: number): void {
      sql.exec('UPDATE participants SET left_at = ? WHERE id = ?', now, id);
    },
    /** Last tap in a minute wins. */
    recordVote(id: string, minuteIdx: number, status: VoteStatus, now: number): void {
      sql.exec(
        `INSERT INTO votes (participant_id, minute_idx, status) VALUES (?, ?, ?)
         ON CONFLICT(participant_id, minute_idx) DO UPDATE SET status = excluded.status`,
        id,
        minuteIdx,
        status,
      );
      sql.exec(
        'UPDATE participants SET last_status = ?, voted = 1, last_seen_at = ? WHERE id = ?',
        status,
        now,
        id,
      );
    },
    votesOf(id: string): { minuteIdx: number; status: VoteStatus }[] {
      return rows(
        'SELECT minute_idx, status FROM votes WHERE participant_id = ? ORDER BY 1',
        id,
      ).map((r) => ({ minuteIdx: r.minute_idx as number, status: r.status as VoteStatus }));
    },
    /** Present = has an open socket, or was seen within the presence window. */
    presentIds(now: number, openIds: readonly string[]): string[] {
      const open = new Set(openIds);
      return rows('SELECT id, last_seen_at FROM participants')
        .filter(
          (r) => open.has(r.id as string) || now - (r.last_seen_at as number) < PRESENCE_WINDOW_SEC,
        )
        .map((r) => r.id as string);
    },
  };
}

export type Store = ReturnType<typeof createStore>;
