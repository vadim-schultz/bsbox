import { attempt, expectEqual } from './attempt';
import { post } from './api';
import type { Check } from './types';

/** Last on purpose: the limiter bucket is shared (10 POST per minute per IP). */
export async function rateLimitCheck(api: string): Promise<Check> {
  return attempt('11 rapid POST /api/series -> at least one 429', async () => {
    const body = {
      start: Math.floor(Date.now() / 1000) + 3600,
      durationMin: 5,
      tz: 'UTC',
      source: 'web',
    };
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) statuses.push((await post(api, body)).status);
    expectEqual('a 429 was seen', true, statuses.includes(429));
    return `statuses ${statuses.join(',')}`;
  });
}
