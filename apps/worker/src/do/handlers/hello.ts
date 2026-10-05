import { signToken, verifyToken, type ClientMessage } from '@bsbox/shared';
import {
  CLOSE_BAD_TOKEN,
  errorReply,
  phaseOf,
  TOKEN_TTL_SEC,
  type HandlerCtx,
  type HandlerResult,
} from './types';

type Hello = Extract<ClientMessage, { type: 'hello' }>;

export async function handleHello(ctx: HandlerCtx, msg: Hello): Promise<HandlerResult> {
  const now = ctx.now();
  let pid: string;
  if (msg.token) {
    const payload = await verifyToken(msg.token, ctx.secret, ctx.sessionId, now);
    if (!payload) {
      return { ...errorReply('bad_token'), close: { code: CLOSE_BAD_TOKEN, reason: 'bad_token' } };
    }
    pid = payload.pid;
  } else {
    pid = crypto.randomUUID();
  }
  ctx.store.ensureParticipant(pid, now);
  ctx.store.markDirty();
  const token =
    msg.token ??
    (await signToken({ pid, sessionId: ctx.sessionId, exp: now + TOKEN_TTL_SEC }, ctx.secret));
  const session = ctx.store.getSession();
  const final = ctx.store.getResult();
  return {
    pid,
    replies: [
      {
        type: 'welcome',
        participantId: pid,
        token,
        session: {
          id: ctx.sessionId,
          state: phaseOf(ctx.store, now),
          start: session?.start ?? 0,
          end: session?.end ?? 0,
        },
        timeline: [],
      },
      ...(final
        ? ([
            { type: 'phase', state: 'ended', at: final.finalizedAt },
            { type: 'ended', result: final.result },
          ] as const)
        : []),
    ],
  };
}
