import type { ServerMessage } from '@bsbox/shared';
import { finalizeSession } from './finalize';
import type { Store } from './store';
import { takeTick } from './ticks';

export const TICK_INTERVAL_SEC = 5;
export const PURGE_DELAY_SEC = 24 * 3600;

export interface AlarmPlan {
  now: number;
  start: number;
  end: number;
  ended: boolean;
  dirty: boolean;
}

/** Next alarm time in epoch seconds: start, tick (live and dirty), end, then purge; null when done. */
export function nextAlarmAt(p: AlarmPlan): number | null {
  if (p.ended || p.now >= p.end) {
    const purgeAt = p.end + PURGE_DELAY_SEC;
    return p.now > purgeAt ? null : purgeAt;
  }
  if (p.now < p.start) return p.start;
  return p.dirty ? Math.min(p.end, p.now + TICK_INTERVAL_SEC) : p.end;
}

/**
 * True when a still-pending alarm is already due no later than `wantMs`. Re-arming on every
 * vote must not push it back, or a busy room would never reach its tick.
 */
export function keepsPendingAlarm(
  currentMs: number | null,
  wantMs: number,
  nowMs: number,
): boolean {
  return currentMs !== null && currentMs > nowMs && currentMs <= wantMs;
}

export interface AlarmDeps {
  store: Store;
  d1: D1Database;
  now: () => number;
  openIds: () => string[];
  broadcast: (msg: ServerMessage) => void;
  closeAll: () => void;
  purge: () => Promise<void>;
  /** Epoch seconds, or null to cancel. */
  setAlarm: (at: number | null) => void;
}

/** Re-arm to the next due time based on the stored session and dirty flag. */
export function rearm(deps: AlarmDeps): void {
  const s = deps.store.getSession();
  if (!s) return;
  deps.setAlarm(
    nextAlarmAt({
      now: deps.now(),
      start: s.start,
      end: s.end,
      ended: s.phase === 'ended',
      dirty: deps.store.isDirty(),
    }),
  );
}

async function end(deps: AlarmDeps, now: number): Promise<void> {
  const { result, fresh } = await finalizeSession({
    store: deps.store,
    d1: deps.d1,
    now,
    openIds: deps.openIds(),
  });
  if (!fresh) return;
  deps.broadcast({ type: 'phase', state: 'ended', at: now });
  deps.broadcast({ type: 'ended', result });
  deps.closeAll();
}

/** The single alarm handler: phase transitions, coalesced ticks, finalize and purge. */
export async function runAlarm(deps: AlarmDeps): Promise<void> {
  const { store } = deps;
  const session = store.getSession();
  if (!session) return;
  const now = deps.now();
  const purgeAt = session.end + PURGE_DELAY_SEC;
  if (session.phase === 'ended' && now >= purgeAt) {
    await deps.purge();
    return;
  }
  if (now >= session.end) {
    await end(deps, now);
  } else if (now >= session.start) {
    if (store.getMeta('live_sent') !== '1') {
      store.setMeta('live_sent', '1');
      deps.broadcast({ type: 'phase', state: 'live', at: now });
    }
    const tick = takeTick(store, now, deps.openIds());
    if (tick) deps.broadcast(tick);
  }
  rearm(deps);
}
