import type { HandlerCtx, HandlerResult } from './types';

export function handlePing(ctx: HandlerCtx, pid: string): HandlerResult {
  ctx.store.touch(pid, ctx.now());
  return { pid, replies: [] };
}
