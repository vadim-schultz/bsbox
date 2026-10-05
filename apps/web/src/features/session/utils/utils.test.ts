import { describe, expect, it } from 'vitest';
import { formatCountdown, isDrifting } from '.';

describe('session utils', () => {
  it('formats countdowns and clamps negatives', () => {
    expect(formatCountdown(90_000)).toBe('1:30');
    expect(formatCountdown(3_725_000)).toBe('1:02:05');
    expect(formatCountdown(-5000)).toBe('0:00');
  });
  it('flags drift only beyond 5 seconds in either direction', () => {
    expect(isDrifting(5000)).toBe(false);
    expect(isDrifting(-5001)).toBe(true);
    expect(isDrifting(30_000)).toBe(true);
  });
});
