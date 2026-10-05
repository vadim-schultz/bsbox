import { lt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { series } from '../db/schema';

export function createRetentionRepo(d1: D1Database) {
  const db = drizzle(d1);
  return {
    /** Deletes series past expires_at; sessions and minutes cascade. Returns series deleted. */
    async deleteExpired(now: number): Promise<number> {
      const rows = await db
        .delete(series)
        .where(lt(series.expiresAt, now))
        .returning({ code: series.code });
      return rows.length;
    },
  };
}
