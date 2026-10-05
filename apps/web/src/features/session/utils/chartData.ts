import { ema } from './smoothing';

export interface MinuteSample {
  minuteIdx: number;
  present: number;
  engaged: number;
  speaking?: number | undefined;
}

export interface ChartPoint extends MinuteSample {
  /** Engaged fraction of those present, 0 when nobody is. */
  share: number;
  /** Smoothed share for the overall line. */
  line: number;
}

export const EMA_ALPHA = 0.4;

/** Upsert a tick into the timeline, keeping it ordered by minute. */
export function mergeTick(timeline: readonly MinuteSample[], tick: MinuteSample): MinuteSample[] {
  const rest = timeline.filter((m) => m.minuteIdx !== tick.minuteIdx);
  return [...rest, tick].sort((a, b) => a.minuteIdx - b.minuteIdx);
}

export function buildPoints(timeline: readonly MinuteSample[]): ChartPoint[] {
  const shares = timeline.map((m) => (m.present > 0 ? m.engaged / m.present : 0));
  const line = ema(shares, EMA_ALPHA);
  return timeline.map((m, i) => ({ ...m, share: shares[i] ?? 0, line: line[i] ?? 0 }));
}

export type ShareBand = 'high' | 'medium' | 'low';

export const shareBand = (share: number): ShareBand =>
  share >= 0.66 ? 'high' : share >= 0.33 ? 'medium' : 'low';
