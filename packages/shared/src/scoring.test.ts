import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { boost, finalScore, level, minuteRatio, rawScore } from './scoring';

describe('scoring', () => {
  it('finalScore matches the architecture formula', () => {
    const expected = Math.min(0.4 * (1 + 0.8 / Math.log2(8)), 0.4 + 0.25, 1);
    expect(finalScore(0.4, 7)).toBeCloseTo(expected, 12);
    expect(boost(7)).toBeCloseTo(1 + 0.8 / 3, 12);
  });

  it('level is inclusive at the thresholds', () => {
    expect(level(0.6)).toBe('high');
    expect(level(0.4)).toBe('healthy');
    expect(level(0.2)).toBe('passive');
    expect(level(0.19)).toBe('low');
  });

  it('rawScore skips empty minutes and averages the rest', () => {
    const minutes = [
      { present: 4, engaged: 2 },
      { present: 0, engaged: 0 },
      { present: 2, engaged: 2 },
    ];
    expect(rawScore(minutes)).toBeCloseTo(0.75, 12);
    expect(rawScore([{ present: 0, engaged: 0 }])).toBe(0);
    expect(minuteRatio(0, 0)).toBeNull();
  });

  it('never exceeds 1 or raw + 0.25 (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 1, max: 2000 }),
        (raw, n) => {
          const s = finalScore(raw, n);
          expect(s).toBeLessThanOrEqual(1);
          expect(s).toBeLessThanOrEqual(raw + 0.25 + 1e-12);
          expect(s).toBeGreaterThanOrEqual(raw - 1e-12);
        },
      ),
    );
  });

  it('throws RangeError for 0-100 values or invalid N', () => {
    expect(() => finalScore(55, 5)).toThrow(RangeError);
    expect(() => finalScore(-0.1, 5)).toThrow(RangeError);
    expect(() => finalScore(Number.NaN, 5)).toThrow(RangeError);
    expect(() => finalScore(0.5, 0)).toThrow(RangeError);
    expect(() => level(60)).toThrow(RangeError);
  });
});
