import { describe, expect, it } from 'vitest';
import { PRESENCE_WINDOW_SEC } from './store';
import { withCtx } from './testKit';

describe('store presence', () => {
  it('open sockets or recent heartbeats are present; stale ones are not', () =>
    withCtx('s1', async ({ store }) => {
      store.ensureParticipant('a', 1000);
      store.ensureParticipant('b', 1000);
      store.ensureParticipant('c', 1000);
      store.touch('c', 1100);
      const now = 1000 + PRESENCE_WINDOW_SEC + 5;
      expect(store.presentIds(now, ['a']).sort()).toEqual(['a', 'c']);
      expect(store.presentIds(now, [])).toEqual(['c']);
    }));

  it('persists session meta', () =>
    withCtx('s2', async ({ store }) => {
      expect(store.getSession()?.phase).toBe('open');
      expect(store.getMeta('missing')).toBeNull();
    }));
});
