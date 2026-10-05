import type { ServerMessage } from '@bsbox/shared';
import type { Store } from './store';

type Tick = Extract<ServerMessage, { type: 'tick' }>;

/** One coalesced tick, or null when no vote/presence change happened since the last one. */
export function takeTick(store: Store, now: number, openIds: readonly string[]): Tick | null {
  const session = store.getSession();
  if (!session || !store.isDirty()) return null;
  store.clearDirty();
  const present = new Set(store.presentIds(now, openIds));
  let engaged = 0;
  let speaking = 0;
  for (const p of store.listParticipants()) {
    if (!present.has(p.id)) continue;
    if (p.lastStatus === 'speaking') speaking += 1;
    if (p.lastStatus !== 'disengaged') engaged += 1;
  }
  const minuteIdx = Math.max(0, Math.floor((now - session.start) / 60));
  return { type: 'tick', minuteIdx, present: present.size, engaged, speaking };
}
