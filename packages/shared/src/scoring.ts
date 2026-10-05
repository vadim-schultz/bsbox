/** Single source of truth for the engagement score (architecture section 3.1). All values are 0..1. */
export const ALPHA = 0.8;
export const CAP = 0.25;
export const THRESHOLDS = { high: 0.6, healthy: 0.4, passive: 0.2 } as const;

export type Level = 'high' | 'healthy' | 'passive' | 'low';
export interface MinuteCount {
  present: number;
  engaged: number;
}

function assertUnit(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be within 0..1, got ${value}`);
  }
}

/** Engaged share for one minute; null when nobody was present. */
export function minuteRatio(present: number, engaged: number): number | null {
  if (present <= 0) return null;
  return Math.min(engaged, present) / present;
}

/** Mean of per-minute ratios over minutes with at least one participant present. */
export function rawScore(minutes: readonly MinuteCount[]): number {
  let sum = 0;
  let count = 0;
  for (const m of minutes) {
    const r = minuteRatio(m.present, m.engaged);
    if (r === null) continue;
    sum += r;
    count += 1;
  }
  return count === 0 ? 0 : sum / count;
}

export function boost(peak: number): number {
  if (!Number.isFinite(peak) || peak < 1) {
    throw new RangeError(`peak participants must be >= 1, got ${peak}`);
  }
  return 1 + ALPHA / Math.log2(peak + 1);
}

export function finalScore(raw: number, peak: number): number {
  assertUnit(raw, 'raw');
  return Math.min(raw * boost(peak), raw + CAP, 1);
}

export function level(score: number): Level {
  assertUnit(score, 'score');
  if (score >= THRESHOLDS.high) return 'high';
  if (score >= THRESHOLDS.healthy) return 'healthy';
  if (score >= THRESHOLDS.passive) return 'passive';
  return 'low';
}
