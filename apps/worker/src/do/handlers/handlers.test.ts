import { signToken } from '@bsbox/shared';
import { describe, expect, it } from 'vitest';
import { SESSION_ID, START, withCtx } from '../testKit';
import { handleFrame } from './index';

const hello = (token?: string) => JSON.stringify({ type: 'hello', ...(token && { token }) });

function welcome(res: Awaited<ReturnType<typeof handleFrame>>) {
  const m = res.replies[0];
  if (m?.type !== 'welcome') throw new Error('expected welcome');
  return m;
}

describe('hello', () => {
  it('issues distinct participants and a vote is stored for the current minute', () =>
    withCtx('h1', async (ctx) => {
      const a = welcome(await handleFrame(ctx, undefined, hello()));
      const b = welcome(await handleFrame(ctx, undefined, hello()));
      expect(a.participantId).not.toBe(b.participantId);
      expect(a.session.state).toBe('live');
      const res = await handleFrame(ctx, a.participantId, '{"type":"vote","status":"engaged"}');
      expect(res.replies).toEqual([]);
      expect(ctx.store.votesOf(a.participantId)).toEqual([{ minuteIdx: 1, status: 'engaged' }]);
      expect(ctx.store.getParticipant(a.participantId)).toMatchObject({
        lastStatus: 'engaged',
        voted: true,
      });
    }));

  it('reconnecting with the issued token returns the same participant', () =>
    withCtx('h2', async (ctx) => {
      const a = welcome(await handleFrame(ctx, undefined, hello()));
      const again = welcome(await handleFrame(ctx, undefined, hello(a.token)));
      expect(again.participantId).toBe(a.participantId);
    }));

  it('tampered, wrong-session or expired tokens yield bad_token and close 4401', () =>
    withCtx('h3', async (ctx) => {
      const good = welcome(await handleFrame(ctx, undefined, hello())).token;
      const expired = await signToken({ pid: 'p', sessionId: SESSION_ID, exp: START }, ctx.secret);
      const other = await signToken({ pid: 'p', sessionId: 'X-1', exp: START + 9999 }, ctx.secret);
      for (const t of [good.slice(0, -2) + 'AA', expired, other]) {
        const res = await handleFrame(ctx, undefined, hello(t));
        expect(res.replies).toEqual([{ type: 'error', code: 'bad_token' }]);
        expect(res.close?.code).toBe(4401);
      }
    }));
});

describe('vote', () => {
  it('is rejected before start and after end and stores nothing', () =>
    withCtx('v1', async (ctx, clock) => {
      const a = welcome(await handleFrame(ctx, undefined, hello()));
      for (const t of [START - 10, START + 1800]) {
        clock.t = t;
        const res = await handleFrame(ctx, a.participantId, '{"type":"vote","status":"engaged"}');
        expect(res.replies).toEqual([{ type: 'error', code: 'not_live' }]);
      }
      expect(ctx.store.votesOf(a.participantId)).toEqual([]);
      expect(ctx.store.getParticipant(a.participantId)?.voted).toBe(false);
    }));

  it('last tap within a minute wins', () =>
    withCtx('v2', async (ctx) => {
      const a = welcome(await handleFrame(ctx, undefined, hello()));
      await handleFrame(ctx, a.participantId, '{"type":"vote","status":"engaged"}');
      await handleFrame(ctx, a.participantId, '{"type":"vote","status":"disengaged"}');
      expect(ctx.store.votesOf(a.participantId)).toEqual([{ minuteIdx: 1, status: 'disengaged' }]);
    }));
});

describe('frames', () => {
  it('malformed JSON or schema yields bad_message without closing', () =>
    withCtx('f1', async (ctx) => {
      for (const raw of ['{nope', '{"type":"vote","status":"bogus"}', '{"type":"x"}']) {
        const res = await handleFrame(ctx, undefined, raw);
        expect(res.replies).toEqual([{ type: 'error', code: 'bad_message' }]);
        expect(res.close).toBeUndefined();
      }
    }));

  it('vote or ping before hello is bad_message', () =>
    withCtx('f2', async (ctx) => {
      const res = await handleFrame(ctx, undefined, '{"type":"ping"}');
      expect(res.replies).toEqual([{ type: 'error', code: 'bad_message' }]);
    }));

  it('ping updates last_seen_at', () =>
    withCtx('f3', async (ctx, clock) => {
      const a = welcome(await handleFrame(ctx, undefined, hello()));
      clock.t += 30;
      await handleFrame(ctx, a.participantId, '{"type":"ping"}');
      expect(ctx.store.getParticipant(a.participantId)?.lastSeenAt).toBe(clock.t);
    }));
});
