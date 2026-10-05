import type { ItemRecurrence } from '../types';

const DAYS: Record<string, string> = {
  mon: 'MO',
  tue: 'TU',
  wed: 'WE',
  thu: 'TH',
  fri: 'FR',
  sat: 'SA',
  sun: 'SU',
};

/** Maps the Office recurrence subset (daily, weekdays, weekly) to an RRULE; anything else is undefined. */
export function toRrule(recurrence: ItemRecurrence | null): string | undefined {
  if (!recurrence) return undefined;
  const interval = Math.max(1, recurrence.recurrenceProperties?.interval ?? 1);
  switch (recurrence.recurrenceType) {
    case 'daily':
      return `FREQ=DAILY;INTERVAL=${interval}`;
    case 'weekday':
      return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
    case 'weekly': {
      const days = (recurrence.recurrenceProperties?.days ?? [])
        .map((d) => DAYS[d.toLowerCase().slice(0, 3)])
        .filter((d): d is string => Boolean(d));
      return `FREQ=WEEKLY;INTERVAL=${interval}${days.length ? `;BYDAY=${days.join(',')}` : ''}`;
    }
    default:
      return undefined;
  }
}
