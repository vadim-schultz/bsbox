import type { SessionResult } from '@bsbox/shared';

export interface Moment {
  minuteIdx: number;
  share: number;
}

export interface Moments {
  peak: Moment;
  low: Moment;
}

/** Highest and lowest engaged share among minutes with someone present; null if none. */
export function findMoments(minutes: SessionResult['minutes']): Moments | null {
  const shares = minutes
    .filter((m) => m.present > 0)
    .map((m) => ({ minuteIdx: m.minuteIdx, share: m.engaged / m.present }));
  const first = shares[0];
  if (!first) return null;
  let peak = first;
  let low = first;
  for (const s of shares) {
    if (s.share > peak.share) peak = s;
    if (s.share < low.share) low = s;
  }
  return { peak, low };
}

/** A result without anyone present has no meaningful score. */
export const isEmptyResult = (r: SessionResult): boolean => r.peak === 0;
