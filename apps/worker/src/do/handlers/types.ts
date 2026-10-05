import type { PhaseState, ServerMessage } from '@bsbox/shared';
import type { Store } from '../store';

export interface HandlerCtx {
  store: Store;
  /** Epoch seconds; injectable so handlers are testable with a fake clock. */
  now: () => number;
  secret: string;
  sessionId: string;
}

export interface HandlerResult {
  replies: ServerMessage[];
  /** Participant bound to the socket after this message. */
  pid?: string;
  close?: { code: number; reason: string };
}

export const TOKEN_TTL_SEC = 2 * 24 * 3600;
export const CLOSE_BAD_TOKEN = 4401;

export function errorReply(code: 'bad_token' | 'bad_message' | 'not_live'): HandlerResult {
  return { replies: [{ type: 'error', code }] };
}

/** Phase from the stored session window and the clock. */
export function phaseOf(store: Store, now: number): PhaseState {
  const s = store.getSession();
  if (!s) return 'scheduled';
  if (s.phase === 'ended' || now >= s.end) return 'ended';
  return now >= s.start ? 'live' : 'scheduled';
}
