import { describe, expect, it } from 'vitest';
import type { SessionResult } from '@bsbox/shared';
import { agreedResult, mismatchedClose, ticksBeforeLive, welcomeTimelineLen } from './collect';
import type { Bot } from './bot';

const result = (score: number) => ({ score }) as SessionResult;
const bot = (over: Partial<Bot>) => ({ messages: [], ...over }) as Bot;

describe('agreedResult', () => {
  it('returns the result when every bot that got one agrees', () => {
    const got = agreedResult([bot({ result: result(0.5) }), bot({}), bot({ result: result(0.5) })]);
    expect(got.result?.score).toBe(0.5);
    expect(got.agree).toBe(true);
  });

  it('flags disagreement', () => {
    const got = agreedResult([bot({ result: result(0.5) }), bot({ result: result(0.6) })]);
    expect(got.agree).toBe(false);
  });

  it('has no result when nobody got one', () => {
    expect(agreedResult([bot({})]).result).toBeUndefined();
  });
});

describe('mismatchedClose', () => {
  it('lists bots whose socket did not close with 1000 after the end', () => {
    const bots = [
      bot({ closeCode: 1000 }),
      bot({ closeCode: 1006 }),
      bot({ closeCode: undefined }),
    ];
    expect(mismatchedClose(bots)).toBe(2);
  });

  it('ignores sockets the client closed itself', () => {
    expect(mismatchedClose([bot({ closeCode: 1005, closedByClient: true })])).toBe(0);
  });
});

const tick = { type: 'tick', minuteIdx: 0, present: 1, engaged: 1, speaking: 0 } as const;
const live = { type: 'phase', state: 'live', at: 1 } as const;
const welcome = { type: 'welcome', timeline: [{}, {}] } as never;

describe('ticksBeforeLive', () => {
  it('counts only the ticks that arrive before phase live', () => {
    expect(ticksBeforeLive(bot({ messages: [tick, live, tick] }))).toBe(1);
    expect(ticksBeforeLive(bot({ messages: [live, tick] }))).toBe(0);
  });
});

describe('welcomeTimelineLen', () => {
  it('reads the timeline length of the welcome, undefined without one', () => {
    expect(welcomeTimelineLen(bot({ messages: [welcome] }))).toBe(2);
    expect(welcomeTimelineLen(bot({}))).toBeUndefined();
  });
});
