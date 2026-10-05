import type { VoteStatus } from '@bsbox/shared';

/** What a persona taps in a given minute; null means "no new tap, the last one carries on". */
export type Tap = VoteStatus | null;

/** A group of identical simulated participants, described purely as data. */
export interface Persona {
  name: string;
  count: number;
  /** One entry per minute index; missing entries mean no tap. */
  script: readonly Tap[];
  /** Minute index at which the socket connects; 0 means in the lobby. */
  joinMin: number;
  /** The socket is closed during this minute, so presence ends with it. */
  leaveMin?: number;
  /** The socket drops and reconnects with its token during this minute. */
  reconnectMin?: number;
  /** Toggles rapidly early in every minute; the scripted tap is the last one. */
  flap?: boolean;
}

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}
