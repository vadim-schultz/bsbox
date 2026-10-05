import type { SessionResult } from '@bsbox/shared';
import type { Bot } from './bot';

/** The pushed result, and whether every bot that received one received the same. */
export function agreedResult(bots: readonly Bot[]): { result?: SessionResult; agree: boolean } {
  const got = bots.flatMap((b) => (b.result ? [b.result] : []));
  const first = got[0];
  const agree = got.every((r) => JSON.stringify(r) === JSON.stringify(first));
  return { result: first, agree };
}

/** Sockets the server should have closed at the end that did not close with 1000. */
export function mismatchedClose(bots: readonly Bot[]): number {
  return bots.filter((b) => !b.closedByClient && b.closeCode !== 1000).length;
}

/** Ticks a bot received before the first `phase live` message. */
export function ticksBeforeLive(bot: Bot): number {
  const liveAt = bot.messages.findIndex((m) => m.type === 'phase' && m.state === 'live');
  const before = liveAt === -1 ? bot.messages : bot.messages.slice(0, liveAt);
  return before.filter((m) => m.type === 'tick').length;
}

export function welcomeTimelineLen(bot: Bot): number | undefined {
  const welcome = bot.messages.find((m) => m.type === 'welcome');
  return welcome?.type === 'welcome' ? welcome.timeline.length : undefined;
}
