import { clientMessageSchema } from '@bsbox/shared';
import { handleHello } from './hello';
import { handlePing } from './ping';
import { errorReply, type HandlerCtx, type HandlerResult } from './types';
import { handleVote } from './vote';

export * from './types';

/**
 * Parse one text frame and route it. Malformed frames yield `bad_message` and never close.
 * `pid` is the participant already bound to the socket, if any.
 */
export async function handleFrame(
  ctx: HandlerCtx,
  pid: string | undefined,
  raw: string,
): Promise<HandlerResult> {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return errorReply('bad_message');
  }
  const parsed = clientMessageSchema.safeParse(json);
  if (!parsed.success) return errorReply('bad_message');
  const msg = parsed.data;
  if (msg.type === 'hello') return handleHello(ctx, msg);
  if (!pid) return errorReply('bad_message');
  return msg.type === 'vote' ? handleVote(ctx, pid, msg) : handlePing(ctx, pid);
}
