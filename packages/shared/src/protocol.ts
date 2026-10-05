import { z } from 'zod';

export const voteStatusSchema = z.enum(['speaking', 'engaged', 'disengaged']);
export const phaseStateSchema = z.enum(['scheduled', 'live', 'ended']);
export const levelSchema = z.enum(['high', 'healthy', 'passive', 'low']);
export const wsErrorCodeSchema = z.enum(['bad_token', 'rate_limited', 'not_found']);

export const minuteSchema = z.object({
  minuteIdx: z.number().int().min(0),
  present: z.number().int().min(0),
  engaged: z.number().int().min(0),
});

export const resultSchema = z.object({
  score: z.number().min(0).max(1),
  level: levelSchema,
  raw: z.number().min(0).max(1),
  peak: z.number().int().min(0),
  participationRate: z.number().min(0).max(1),
  minutes: z.array(minuteSchema),
});

export const sessionInfoSchema = z.object({
  id: z.string(),
  state: phaseStateSchema,
  start: z.number().int(),
  end: z.number().int(),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), token: z.string().optional() }),
  z.object({ type: z.literal('vote'), status: voteStatusSchema }),
  z.object({ type: z.literal('ping') }),
]);

export const serverMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('welcome'),
    participantId: z.string(),
    token: z.string(),
    session: sessionInfoSchema,
    timeline: z.array(minuteSchema.extend({ speaking: z.number().int().min(0).optional() })),
  }),
  z.object({
    type: z.literal('tick'),
    minuteIdx: z.number().int().min(0),
    present: z.number().int().min(0),
    engaged: z.number().int().min(0),
    speaking: z.number().int().min(0),
  }),
  z.object({ type: z.literal('phase'), state: phaseStateSchema, at: z.number().int() }),
  z.object({ type: z.literal('ended'), result: resultSchema }),
  z.object({ type: z.literal('error'), code: wsErrorCodeSchema }),
]);

export type VoteStatus = z.infer<typeof voteStatusSchema>;
export type PhaseState = z.infer<typeof phaseStateSchema>;
export type SessionResult = z.infer<typeof resultSchema>;
export type SessionInfo = z.infer<typeof sessionInfoSchema>;
export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;
