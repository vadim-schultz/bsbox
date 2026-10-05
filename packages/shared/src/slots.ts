import { RRule } from 'rrule';

export interface SeriesSchedule {
  startUtc: number;
  durationMin: number;
  tz: string;
  rrule: string | null;
}
export interface Slot {
  start: number;
  end: number;
}

const SEARCH_DAYS = 400;

/** Zero-based minute bucket of time t (epoch s) within a session starting at start (epoch s). */
export function minuteIndex(start: number, t: number): number {
  return Math.floor((t - start) / 60);
}

/** Offset (ms) of tz from UTC at the given instant. */
function offsetMs(epochMs: number, tz: string): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(epochMs));
  const get = (t: string): number => Number(p.find((x) => x.type === t)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(epochMs / 1000) * 1000;
}

/** Wall-clock time of an instant, expressed as a "floating" UTC date. */
function toFloating(epochMs: number, tz: string): number {
  return epochMs + offsetMs(epochMs, tz);
}

/** Inverse of toFloating (resolves DST by re-evaluating the offset). */
function fromFloating(floatingMs: number, tz: string): number {
  const guess = floatingMs - offsetMs(floatingMs, tz);
  return floatingMs - offsetMs(guess, tz);
}

/**
 * Start times (epoch s) of occurrences within [from, to]. The wall-clock time of dtstart in tz
 * is preserved across DST changes. A null rrule yields only dtstart.
 */
export function occurrences(
  rrule: string | null,
  tz: string,
  dtstart: number,
  from: number,
  to: number,
): number[] {
  if (rrule === null) return dtstart >= from && dtstart <= to ? [dtstart] : [];
  const rule = new RRule({
    ...RRule.parseString(rrule),
    dtstart: new Date(toFloating(dtstart * 1000, tz)),
  });
  const lo = new Date(toFloating(from * 1000, tz) - 86_400_000);
  const hi = new Date(toFloating(to * 1000, tz) + 86_400_000);
  return rule
    .between(lo, hi, true)
    .map((d) => Math.floor(fromFloating(d.getTime(), tz) / 1000))
    .filter((t) => t >= from && t <= to);
}

/** The occurrence running at `now`, or the next one; null when the series has ended. */
export function currentOrNext(series: SeriesSchedule, now: number): Slot | null {
  const duration = series.durationMin * 60;
  const starts = occurrences(
    series.rrule,
    series.tz,
    series.startUtc,
    now - duration,
    now + SEARCH_DAYS * 86_400,
  );
  for (const start of starts) {
    if (start + duration > now) return { start, end: start + duration };
  }
  return null;
}
