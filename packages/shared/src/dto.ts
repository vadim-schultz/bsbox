import { z } from 'zod';
import { phaseStateSchema, resultSchema, sessionInfoSchema } from './protocol';

export const sourceSchema = z.enum(['outlook', 'teams', 'web']);

export const problemCodeSchema = z.enum([
  'bad_request',
  'validation_failed',
  'not_found',
  'unauthorized',
  'rate_limited',
  'session_not_live',
  'expired',
  'internal_error',
]);

export const problemSchema = z.object({
  type: z.string().optional(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  code: problemCodeSchema,
});

export const createSeriesRequestSchema = z.object({
  title: z.string().max(200).optional(),
  start: z.number().int().positive(),
  durationMin: z.number().int().min(5).max(480),
  tz: z.string().min(1),
  rrule: z.string().min(1).optional(),
  source: sourceSchema,
  externalKey: z.string().min(1).max(200).optional(),
});

export const createSeriesResponseSchema = z.object({
  code: z.string(),
  joinUrl: z.string().url(),
  editToken: z.string().optional(),
});

export const patchSeriesRequestSchema = createSeriesRequestSchema
  .pick({ title: true, start: true, durationMin: true, tz: true, rrule: true })
  .partial();

export const seriesResponseSchema = z.object({
  code: z.string(),
  title: z.string().nullable(),
  schedule: z.object({
    tz: z.string(),
    start: z.number().int(),
    durationMin: z.number().int(),
    rrule: z.string().nullable(),
  }),
  session: sessionInfoSchema,
  serverTime: z.number().int(),
});

export const sessionResponseSchema = z.object({
  id: z.string(),
  series: z.string(),
  state: phaseStateSchema,
  start: z.number().int(),
  end: z.number().int(),
  result: resultSchema.optional(),
});

export const sessionListResponseSchema = z.object({
  items: z.array(sessionResponseSchema),
  nextCursor: z.string().nullable(),
});

export type ProblemCode = z.infer<typeof problemCodeSchema>;
export type CreateSeriesRequest = z.infer<typeof createSeriesRequestSchema>;
export type CreateSeriesResponse = z.infer<typeof createSeriesResponseSchema>;
export type SeriesResponse = z.infer<typeof seriesResponseSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
