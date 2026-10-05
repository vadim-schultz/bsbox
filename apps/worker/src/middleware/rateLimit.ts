import type { MiddlewareHandler } from 'hono';
import type { Env } from '../env';
import { ProblemError } from './problem';

/** Per-IP rate limit through the Workers Rate Limiting binding. */
export function rateLimit(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const key = c.req.header('cf-connecting-ip') ?? 'unknown';
    const { success } = await c.env.SERIES_RATE_LIMITER.limit({ key });
    if (!success) throw new ProblemError(429, 'rate_limited');
    await next();
  };
}
