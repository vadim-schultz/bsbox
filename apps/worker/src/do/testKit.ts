import { env, runInDurableObject } from 'cloudflare:test';
import { createStore, type Store } from './store';
import type { HandlerCtx } from './handlers';

export const START = 1_700_000_000;
export const END = START + 1800;
export const SESSION_ID = 'ABCDEFGHJK-1700000000';

/** Runs `fn` with a fresh store on real DO SQLite and a mutable fake clock. */
export async function withCtx<T>(
  name: string,
  fn: (ctx: HandlerCtx, clock: { t: number }) => Promise<T>,
): Promise<T> {
  const stub = env.SESSION_ROOM.get(env.SESSION_ROOM.idFromName(name));
  return runInDurableObject(stub, async (_i, state) => {
    const store: Store = createStore(state.storage.sql);
    store.saveSession({ sessionId: SESSION_ID, start: START, end: END, phase: 'open' });
    const clock = { t: START + 90 };
    return fn(
      { store, now: () => clock.t, secret: env.TOKEN_HMAC_KEY, sessionId: SESSION_ID },
      clock,
    );
  });
}
