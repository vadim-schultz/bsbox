import type { ClientMessage } from '@bsbox/shared';
import { errorReply, phaseOf, type HandlerCtx, type HandlerResult } from './types';

type Vote = Extract<ClientMessage, { type: 'vote' }>;

/** Accepted only while the session is live; the last tap within a minute wins. */
export function handleVote(ctx: HandlerCtx, pid: string, msg: Vote): HandlerResult {
  const now = ctx.now();
  const session = ctx.store.getSession();
  if (!session || phaseOf(ctx.store, now) !== 'live') return errorReply('not_live');
  const minuteIdx = Math.floor((now - session.start) / 60);
  ctx.store.recordVote(pid, minuteIdx, msg.status, now);
  return { pid, replies: [] };
}
