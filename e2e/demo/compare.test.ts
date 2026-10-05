import { describe, expect, it } from 'vitest';
import type { SessionResult } from '@bsbox/shared';
import { compareResults } from './compare';
import type { Expected } from './groundTruth';

const minutes = [
  { minuteIdx: 0, present: 4, engaged: 2 },
  { minuteIdx: 1, present: 4, engaged: 3 },
];
const expected: Expected = {
  minutes,
  raw: 0.625,
  score: 0.7,
  level: 'high',
  peak: 4,
  participationRate: 0.5,
};
const actual: SessionResult = { ...expected, minutes };

const failing = (r: SessionResult) =>
  compareResults('A', expected, r)
    .filter((c) => !c.ok)
    .map((c) => c.name);

describe('compareResults', () => {
  it('passes when the server matches ground truth', () => {
    expect(failing(actual)).toEqual([]);
  });

  it('allows a score within 0.02 but not beyond', () => {
    expect(failing({ ...actual, score: 0.715 })).toEqual([]);
    expect(failing({ ...actual, score: 0.73 })).toEqual(['A score within 0.02']);
  });

  it('fails on a different level, peak or participation rate', () => {
    const bad = { ...actual, level: 'low', peak: 5, participationRate: 0.4 } as SessionResult;
    expect(failing(bad)).toEqual(['A level', 'A peak', 'A participationRate']);
  });

  it('fails with a readable diff when minutes differ', () => {
    const wrong = { ...actual, minutes: [minutes[0]!, { minuteIdx: 1, present: 4, engaged: 1 }] };
    const check = compareResults('A', expected, wrong).find((c) => c.name === 'A minutes');
    expect(check?.ok).toBe(false);
    expect(check?.detail).toContain('minute 1: expected 4/3, got 4/1');
  });
});
