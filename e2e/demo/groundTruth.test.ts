import { describe, expect, it } from 'vitest';
import { finalScore, level, rawScore } from '@bsbox/shared/scoring';
import { expectedResult } from './groundTruth';
import type { Persona } from './types';

const p = (over: Partial<Persona>): Persona => ({
  name: 'p',
  count: 1,
  script: [],
  joinMin: 0,
  ...over,
});

describe('expectedResult', () => {
  it('counts presence and carried-forward engagement per minute', () => {
    const r = expectedResult([p({ script: ['engaged'] }), p({})], 3);
    expect(r.minutes).toEqual([
      { minuteIdx: 0, present: 2, engaged: 1 },
      { minuteIdx: 1, present: 2, engaged: 1 },
      { minuteIdx: 2, present: 2, engaged: 1 },
    ]);
  });

  it('treats speaking as engaged and disengaged as a withdrawal', () => {
    const r = expectedResult([p({ script: ['speaking', null, 'disengaged'] })], 3);
    expect(r.minutes.map((m) => m.engaged)).toEqual([1, 1, 0]);
  });

  it('starts presence at joinMin and ends it after leaveMin', () => {
    const r = expectedResult([p({ joinMin: 1, leaveMin: 2 })], 4);
    expect(r.minutes.map((m) => m.present)).toEqual([0, 1, 1, 0]);
  });

  it('multiplies by persona count', () => {
    const r = expectedResult([p({ count: 3, script: ['engaged'] })], 1);
    expect(r.minutes[0]).toEqual({ minuteIdx: 0, present: 3, engaged: 3 });
  });

  it('scores through the shared scoring functions', () => {
    const r = expectedResult([p({ count: 4, script: ['engaged'] }), p({ count: 4 })], 2);
    const raw = rawScore(r.minutes);
    expect(r.raw).toBe(raw);
    expect(r.score).toBe(finalScore(raw, 8));
    expect(r.level).toBe(level(r.score));
    expect(r.peak).toBe(8);
  });

  it('computes participation as the share of participants who ever tapped', () => {
    const r = expectedResult([p({ count: 1, script: ['engaged'] }), p({ count: 3 })], 1);
    expect(r.participationRate).toBe(0.25);
  });

  it('is empty when nobody exists', () => {
    const r = expectedResult([], 5);
    expect([r.peak, r.score, r.level, r.participationRate]).toEqual([0, 0, 'low', 0]);
  });
});
