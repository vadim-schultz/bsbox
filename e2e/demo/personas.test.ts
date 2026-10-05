import { describe, expect, it } from 'vitest';
import { expectedResult } from './groundTruth';
import { MIN_AUDIENCE_A, personasA, personasB } from './personas';

const total = (list: readonly { count: number }[]) => list.reduce((n, p) => n + p.count, 0);

describe('session A personas', () => {
  it('has 18 bots in the documented mix', () => {
    expect(total(personasA)).toBe(MIN_AUDIENCE_A);
    expect(personasA.map((p) => p.name)).toContain('lurker');
  });

  it('never taps outside the 8 minute window', () => {
    expect(personasA.every((p) => p.script.length <= 8)).toBe(true);
  });

  it('dips mid-meeting and recovers, so the chart has a visible low and peak', () => {
    const share = expectedResult(personasA, 8).minutes.map((m) => m.engaged / m.present);
    expect(Math.min(share[3] ?? 1, share[4] ?? 1)).toBeLessThan(0.45);
    expect(Math.max(share[5] ?? 0, share[6] ?? 0)).toBeGreaterThan(share[4] ?? 1);
  });

  it('is healthy or better overall', () => {
    expect(['high', 'healthy']).toContain(expectedResult(personasA, 8).level);
  });
});

describe('session B personas', () => {
  it('is a mostly silent room of 10 that scores low or passive', () => {
    expect(total(personasB)).toBe(10);
    expect(['low', 'passive']).toContain(expectedResult(personasB, 5).level);
  });
});
