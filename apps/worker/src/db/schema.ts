import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

/** Timestamps are epoch seconds (UTC). No PII columns. */
export const series = sqliteTable(
  'series',
  {
    code: text('code').primaryKey(),
    title: text('title'),
    source: text('source', { enum: ['outlook', 'teams', 'web'] }).notNull(),
    externalKey: text('external_key').unique(),
    tz: text('tz').notNull(),
    startUtc: integer('start_utc').notNull(),
    durationMin: integer('duration_min').notNull(),
    rrule: text('rrule'),
    editTokenHash: text('edit_token_hash').notNull(),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [
    check('series_source_check', sql`${t.source} IN ('outlook','teams','web')`),
    check('series_duration_check', sql`${t.durationMin} BETWEEN 5 AND 480`),
  ],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    seriesCode: text('series_code')
      .notNull()
      .references(() => series.code, { onDelete: 'cascade' }),
    startTs: integer('start_ts').notNull(),
    endTs: integer('end_ts').notNull(),
    state: text('state', { enum: ['scheduled', 'live', 'ended'] }).notNull(),
    peakParticipants: integer('peak_participants'),
    participationRate: real('participation_rate'),
    raw: real('raw'),
    score: real('score'),
    level: text('level', { enum: ['high', 'healthy', 'passive', 'low'] }),
    finalizedAt: integer('finalized_at'),
  },
  (t) => [
    index('sessions_series_start_idx').on(t.seriesCode, t.startTs),
    check('sessions_state_check', sql`${t.state} IN ('scheduled','live','ended')`),
  ],
);

export const sessionMinutes = sqliteTable(
  'session_minutes',
  {
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    minuteIdx: integer('minute_idx').notNull(),
    present: integer('present').notNull(),
    engaged: integer('engaged').notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.minuteIdx] })],
);
