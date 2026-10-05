import { describe, expect, it } from 'vitest';
import { ema } from './smoothing';
import { buildPoints, mergeTick, shareBand } from './chartData';

describe('ema', () => {
  it('smooths a step and keeps the first value', () => {
    expect(ema([0, 1, 1], 0.5)).toEqual([0, 0.5, 0.75]);
  });
  it('returns an empty list for no data', () => {
    expect(ema([], 0.5)).toEqual([]);
  });
});

describe('chartData', () => {
  const tick = (minuteIdx: number, present: number, engaged: number) => ({
    minuteIdx,
    present,
    engaged,
    speaking: 0,
  });

  it('replaces the entry for the same minute and appends a new one in order', () => {
    const a = mergeTick([{ minuteIdx: 0, present: 2, engaged: 1 }], tick(0, 3, 2));
    expect(a).toEqual([{ minuteIdx: 0, present: 3, engaged: 2, speaking: 0 }]);
    expect(mergeTick(a, tick(1, 3, 1)).map((m) => m.minuteIdx)).toEqual([0, 1]);
  });

  it('builds points with engaged share, treating empty minutes as zero', () => {
    const pts = buildPoints([
      { minuteIdx: 0, present: 4, engaged: 3 },
      { minuteIdx: 1, present: 0, engaged: 0 },
    ]);
    expect(pts.map((p) => p.share)).toEqual([0.75, 0]);
    expect(pts[0]?.line).toBeCloseTo(0.75);
  });

  it('bands the engaged share', () => {
    expect([shareBand(0.9), shareBand(0.5), shareBand(0.1)]).toEqual(['high', 'medium', 'low']);
  });
});
