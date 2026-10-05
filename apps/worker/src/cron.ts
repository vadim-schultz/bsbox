import { createRetentionRepo } from './repos';
import type { Env } from './env';

/** Daily Cron Trigger: delete series past their 30-day retention (sessions and minutes cascade). */
export async function scheduled(_controller: ScheduledController, env: Env): Promise<void> {
  await createRetentionRepo(env.DB).deleteExpired(Math.floor(Date.now() / 1000));
}
