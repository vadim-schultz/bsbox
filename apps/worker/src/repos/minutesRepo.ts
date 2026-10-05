import { asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { sessionMinutes } from '../db/schema';

export interface Minute {
  minuteIdx: number;
  present: number;
  engaged: number;
}

// D1 allows at most 100 bound parameters per statement; 3 columns per row.
const CHUNK = 30;

export function createMinutesRepo(d1: D1Database) {
  const db = drizzle(d1);
  return {
    async insertMany(sessionId: string, minutes: Minute[]): Promise<void> {
      for (let i = 0; i < minutes.length; i += CHUNK) {
        const rows = minutes.slice(i, i + CHUNK).map((m) => ({ sessionId, ...m }));
        await db.insert(sessionMinutes).values(rows).onConflictDoNothing();
      }
    },
    async listBySession(sessionId: string): Promise<Minute[]> {
      return db
        .select({
          minuteIdx: sessionMinutes.minuteIdx,
          present: sessionMinutes.present,
          engaged: sessionMinutes.engaged,
        })
        .from(sessionMinutes)
        .where(eq(sessionMinutes.sessionId, sessionId))
        .orderBy(asc(sessionMinutes.minuteIdx));
    },
  };
}
