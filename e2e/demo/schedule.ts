import type { VoteStatus } from '@bsbox/shared';
import type { Persona } from './types';

export interface Action {
  /** Seconds after the session's start. */
  atSec: number;
  kind: 'vote' | 'leave' | 'drop' | 'reconnect';
  status?: VoteStatus;
}

const TAP_AT = 10;
const FLAP_AT = [1, 4, 7];
const JOIN_AT = 5;
const LEAVE_AT = 25;
const DROP_AT = 20;
const RECONNECT_AT = 30;

const minuteStart = (m: number): number => m * 60;
const opposite = (s: VoteStatus): VoteStatus => (s === 'engaged' ? 'disengaged' : 'engaged');

/** Seconds after start at which a late persona connects; null when it joins in the lobby. */
export function joinOffsetSec(p: Persona): number | null {
  return p.joinMin === 0 ? null : minuteStart(p.joinMin) + JOIN_AT;
}

function tapActions(p: Persona, m: number, status: VoteStatus): Action[] {
  const at = minuteStart(m);
  const flaps = p.flap ? FLAP_AT.map((s, i) => flapAction(at + s, i, status)) : [];
  return [...flaps, { atSec: at + TAP_AT, kind: 'vote', status }];
}

const flapAction = (atSec: number, i: number, final: VoteStatus): Action => ({
  atSec,
  kind: 'vote',
  status: i % 2 === 0 ? opposite(final) : final,
});

function lifecycleActions(p: Persona): Action[] {
  const out: Action[] = [];
  if (p.leaveMin !== undefined)
    out.push({ atSec: minuteStart(p.leaveMin) + LEAVE_AT, kind: 'leave' });
  if (p.reconnectMin === undefined) return out;
  const at = minuteStart(p.reconnectMin);
  return [
    ...out,
    { atSec: at + DROP_AT, kind: 'drop' },
    { atSec: at + RECONNECT_AT, kind: 'reconnect' },
  ];
}

/** Everything a persona does after connecting, in time order. */
export function actionsFor(p: Persona): Action[] {
  const taps = p.script.flatMap((t, m) => (t === null ? [] : tapActions(p, m, t)));
  return [...taps, ...lifecycleActions(p)].sort((a, b) => a.atSec - b.atSec);
}
