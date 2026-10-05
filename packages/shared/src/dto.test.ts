import { describe, expect, it } from 'vitest';
import { createSeriesRequestSchema, problemCodeSchema, sessionResponseSchema } from './dto';

describe('dto', () => {
  it('accepts a valid create-series request', () => {
    const r = createSeriesRequestSchema.parse({
      start: 1_700_000_000,
      durationMin: 30,
      tz: 'Europe/Berlin',
      source: 'outlook',
    });
    expect(r.durationMin).toBe(30);
    expect(problemCodeSchema.parse('not_found')).toBe('not_found');
  });

  it('rejects out-of-range duration, bad source and unknown problem code', () => {
    const base = { start: 1, tz: 'UTC', source: 'web' };
    expect(() => createSeriesRequestSchema.parse({ ...base, durationMin: 4 })).toThrow();
    expect(() => createSeriesRequestSchema.parse({ ...base, durationMin: 481 })).toThrow();
    expect(() =>
      createSeriesRequestSchema.parse({ ...base, durationMin: 30, source: 'fax' }),
    ).toThrow();
    expect(() => problemCodeSchema.parse('oops')).toThrow();
    expect(() =>
      sessionResponseSchema.parse({
        id: 'x',
        series: 'y',
        state: 'ended',
        start: 1,
        end: 2,
        result: { score: 55 },
      }),
    ).toThrow();
  });
});
