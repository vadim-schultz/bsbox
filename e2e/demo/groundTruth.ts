import { finalScore, level, rawScore, type Level, type MinuteCount } from '@bsbox/shared/scoring';
import type { VoteStatus } from '@bsbox/shared';
import type { Persona, Tap } from './types';

export interface ExpectedMinute extends MinuteCount {
  minuteIdx: number;
}

export interface Expected {
  minutes: ExpectedMinute[];
  raw: number;
  score: number;
  level: Level;
  peak: number;
  participationRate: number;
}

const isEngaged = (s: VoteStatus): boolean => s === 'speaking' || s === 'engaged';

const isPresent = (p: Persona, m: number): boolean =>
  m >= p.joinMin && m <= (p.leaveMin ?? Infinity);

/** The status in force during minute m: the latest tap at or before it, else disengaged. */
function statusAt(script: readonly Tap[], m: number): VoteStatus {
  const taps = script.slice(0, m + 1).filter((t): t is VoteStatus => t !== null);
  return taps.at(-1) ?? 'disengaged';
}

function minuteOf(personas: readonly Persona[], m: number): ExpectedMinute {
  const here = personas.filter((p) => isPresent(p, m));
  const engaged = here.filter((p) => isEngaged(statusAt(p.script, m)));
  const sum = (list: readonly Persona[]) => list.reduce((n, p) => n + p.count, 0);
  return { minuteIdx: m, present: sum(here), engaged: sum(engaged) };
}

function participation(personas: readonly Persona[]): number {
  const total = personas.reduce((n, p) => n + p.count, 0);
  const voters = personas.filter((p) => p.script.some((t) => t !== null));
  const voted = voters.reduce((n, p) => n + p.count, 0);
  return total === 0 ? 0 : voted / total;
}

/** Replays persona scripts into the per-minute counts the server must arrive at. */
export function expectedResult(personas: readonly Persona[], durationMin: number): Expected {
  const minutes = Array.from({ length: durationMin }, (_, m) => minuteOf(personas, m));
  const peak = Math.max(0, ...minutes.map((m) => m.present));
  const raw = rawScore(minutes);
  const score = peak < 1 ? 0 : finalScore(raw, peak);
  return {
    minutes,
    raw,
    score,
    level: level(score),
    peak,
    participationRate: participation(personas),
  };
}
