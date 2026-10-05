import { and, desc, eq, lt, ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { sessions } from '../db/schema';

export type Session = typeof sessions.$inferSelect;
export type ScheduledSession = Pick<
  typeof sessions.$inferInsert,
  'id' | 'seriesCode' | 'startTs' | 'endTs'
>;
export type SessionResult = Required<
  Pick<
    typeof sessions.$inferInsert,
    'peakParticipants' | 'participationRate' | 'raw' | 'score' | 'level' | 'finalizedAt'
  >
>;
export interface SessionPage {
  items: Session[];
  /** Opaque cursor for the next page, or null at the end. */
  nextCursor: string | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseCursor(cursor: string | null | undefined): number | null {
  if (!cursor) return null;
  const n = Number(cursor);
  return Number.isSafeInteger(n) ? n : null;
}

export function createSessionsRepo(d1: D1Database) {
  const db = drizzle(d1);
  return {
    /** Insert a scheduled session; an existing session is only re-timed while not ended. */
    async upsertScheduled(input: ScheduledSession): Promise<Session> {
      await db
        .insert(sessions)
        .values({ ...input, state: 'scheduled' })
        .onConflictDoUpdate({
          target: sessions.id,
          set: { startTs: input.startTs, endTs: input.endTs },
          setWhere: ne(sessions.state, 'ended'),
        });
      return (await this.getById(input.id))!;
    },
    async finalize(id: string, result: SessionResult): Promise<Session | null> {
      const rows = await db
        .update(sessions)
        .set({ ...result, state: 'ended' })
        .where(eq(sessions.id, id))
        .returning();
      return rows[0] ?? null;
    },
    async getById(id: string): Promise<Session | null> {
      const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
      return rows[0] ?? null;
    },
    /** Newest first. The cursor is the start_ts of the last returned item (exclusive). */
    async listBySeries(
      seriesCode: string,
      opts: { limit?: number; cursor?: string | null } = {},
    ): Promise<SessionPage> {
      const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
      const before = parseCursor(opts.cursor);
      const where =
        before === null
          ? eq(sessions.seriesCode, seriesCode)
          : and(eq(sessions.seriesCode, seriesCode), lt(sessions.startTs, before));
      const rows = await db
        .select()
        .from(sessions)
        .where(where)
        .orderBy(desc(sessions.startTs))
        .limit(limit + 1);
      const items = rows.slice(0, limit);
      const last = items[items.length - 1];
      return { items, nextCursor: rows.length > limit && last ? String(last.startTs) : null };
    },
  };
}
