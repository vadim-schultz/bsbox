import { describe, expect, it } from 'vitest';
import { evaluate, percentile } from './stats';

const limits = { p95Ms: 6500, maxErrorRate: 0.01 };

describe('percentile', () => {
  it('uses the nearest-rank method and handles empty input', () => {
    expect(percentile([10, 20, 30, 40, 50], 0.95)).toBe(50);
    expect(percentile([10, 20, 30, 40, 50], 0.5)).toBe(30);
    expect(percentile([], 0.95)).toBe(0);
  });
});

describe('evaluate', () => {
  it('passes when latency and error rate are inside the limits', () => {
    const r = evaluate({ latenciesMs: [100, 200, 300], attempts: 100, errors: 0 }, limits);
    expect(r.ok).toBe(true);
    expect(r.failures).toEqual([]);
  });

  it('fails when the error rate exceeds the threshold', () => {
    const r = evaluate({ latenciesMs: [100], attempts: 100, errors: 5 }, limits);
    expect(r.ok).toBe(false);
    expect(r.failures.join(' ')).toMatch(/error rate/);
  });

  it('fails when p95 exceeds the threshold or no tick was ever received', () => {
    expect(evaluate({ latenciesMs: [9000], attempts: 10, errors: 0 }, limits).ok).toBe(false);
    expect(evaluate({ latenciesMs: [], attempts: 10, errors: 0 }, limits).ok).toBe(false);
  });
});
