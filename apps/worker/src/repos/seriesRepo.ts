import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { series } from '../db/schema';
import { Conflict, isUniqueViolation } from './errors';

export type Series = typeof series.$inferSelect;
export type NewSeries = typeof series.$inferInsert;
export type SeriesPatch = Partial<
  Pick<NewSeries, 'title' | 'tz' | 'startUtc' | 'durationMin' | 'rrule' | 'expiresAt'>
>;

export function createSeriesRepo(d1: D1Database) {
  const db = drizzle(d1);
  return {
    async create(input: NewSeries): Promise<Series> {
      try {
        const rows = await db.insert(series).values(input).returning();
        return rows[0]!;
      } catch (err) {
        if (isUniqueViolation(err)) throw new Conflict('series already exists');
        throw err;
      }
    },
    async getByCode(code: string): Promise<Series | null> {
      const rows = await db.select().from(series).where(eq(series.code, code)).limit(1);
      return rows[0] ?? null;
    },
    async getByExternalKey(externalKey: string): Promise<Series | null> {
      const rows = await db
        .select()
        .from(series)
        .where(eq(series.externalKey, externalKey))
        .limit(1);
      return rows[0] ?? null;
    },
    async update(code: string, patch: SeriesPatch): Promise<Series | null> {
      if (Object.keys(patch).length === 0) return this.getByCode(code);
      const rows = await db.update(series).set(patch).where(eq(series.code, code)).returning();
      return rows[0] ?? null;
    },
  };
}
