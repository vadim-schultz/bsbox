import type { Env } from './env';

const realNow = (): number => Math.floor(Date.now() / 1000);

/**
 * Request-scoped clock (epoch seconds). Only when `ENVIRONMENT` is `test` may a request pin it
 * with `?now=<epoch seconds>`; everywhere else the parameter is ignored.
 */
export function clockFor(
  env: Pick<Env, 'ENVIRONMENT'>,
  url: string,
  fallback: () => number = realNow,
): () => number {
  if (env.ENVIRONMENT !== 'test') return fallback;
  const raw = new URL(url).searchParams.get('now');
  if (raw === null || !/^\d+$/.test(raw)) return fallback;
  const pinned = Number(raw);
  return pinned > 0 ? () => pinned : fallback;
}
