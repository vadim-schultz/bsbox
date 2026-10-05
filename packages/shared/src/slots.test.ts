import { describe, expect, it } from 'vitest';
import { currentOrNext, minuteIndex, occurrences } from './slots';

const localHour = (epochSec: number, tz: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(epochSec * 1000));

describe('slots', () => {
  it('minuteIndex floors elapsed minutes', () => {
    expect(minuteIndex(1000, 1000)).toBe(0);
    expect(minuteIndex(1000, 1119)).toBe(1);
    expect(minuteIndex(1000, 999)).toBe(-1);
  });

  it('weekly occurrences keep 10:00 local across the DST change', () => {
    // Mon 2025-03-24 10:00 Europe/Berlin (CET, UTC+1) = 09:00Z
    const start = Date.UTC(2025, 2, 24, 9, 0) / 1000;
    const from = Date.UTC(2025, 2, 20) / 1000;
    const to = Date.UTC(2025, 3, 15) / 1000;
    const occ = occurrences('FREQ=WEEKLY;BYDAY=MO', 'Europe/Berlin', start, from, to);
    expect(occ.length).toBe(4);
    for (const o of occ) expect(localHour(o, 'Europe/Berlin')).toBe('10:00');
    // 2025-03-31 is CEST (UTC+2): 08:00Z
    expect(occ[1]).toBe(Date.UTC(2025, 2, 31, 8, 0) / 1000);
  });

  it('non-recurring series yields only its start; out-of-range yields none', () => {
    const start = 1_700_000_000;
    expect(occurrences(null, 'UTC', start, start - 10, start + 10)).toEqual([start]);
    expect(occurrences(null, 'UTC', start, start + 1, start + 10)).toEqual([]);
  });

  it('currentOrNext picks the running or upcoming occurrence', () => {
    const start = Date.UTC(2025, 2, 24, 9, 0) / 1000;
    const series = {
      startUtc: start,
      durationMin: 30,
      tz: 'Europe/Berlin',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
    };
    expect(currentOrNext(series, start + 600)).toEqual({ start, end: start + 1800 });
    const next = currentOrNext(series, start + 3600);
    expect(next?.start).toBe(Date.UTC(2025, 2, 31, 8, 0) / 1000);
    expect(currentOrNext({ ...series, rrule: null }, start + 99999)).toBeNull();
  });
});
