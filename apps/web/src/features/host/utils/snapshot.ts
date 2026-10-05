import type { CreateSeriesRequest } from '@bsbox/shared';
import type { ItemSnapshot } from '../types';
import { toRrule } from './rrule';

const TEAMS_JOIN = /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s<>"')]+/;

/** Spike S1 probe: the Teams join URL from the invite body, if present. */
export function findTeamsJoinUrl(bodyText: string): string | undefined {
  return TEAMS_JOIN.exec(bodyText)?.[0];
}

export type Schedule = Pick<
  CreateSeriesRequest,
  'title' | 'start' | 'durationMin' | 'tz' | 'rrule'
>;

export function toSchedule(snap: ItemSnapshot): Schedule {
  const minutes = Math.round((snap.end.getTime() - snap.start.getTime()) / 60_000);
  const rrule = toRrule(snap.recurrence);
  return {
    ...(snap.subject ? { title: snap.subject.slice(0, 200) } : {}),
    start: Math.floor(snap.start.getTime() / 1000),
    durationMin: Math.min(480, Math.max(5, minutes)),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...(rrule ? { rrule } : {}),
  };
}

export function toCreateRequest(snap: ItemSnapshot): CreateSeriesRequest {
  const externalKey = findTeamsJoinUrl(snap.bodyText);
  return { ...toSchedule(snap), source: 'outlook', ...(externalKey ? { externalKey } : {}) };
}
