import type { CreateSeriesRequest } from '@bsbox/shared';
import type { TeamsHostInfo } from '../types';

/** cyrb53: small, stable, non-cryptographic hash; the key only needs to be deterministic. */
function hash(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/** `teams:<hash of joinUrl|threadId>`; the server resolves the same key to the same series. */
export function teamsExternalKey({ context, meeting }: TeamsHostInfo): string | undefined {
  const joinUrl = meeting?.joinUrl ?? '';
  const thread = meeting?.threadId ?? context.chatId ?? context.meetingId ?? '';
  return joinUrl || thread ? `teams:${hash(`${joinUrl}|${thread}`)}` : undefined;
}

const DEFAULT_MINUTES = 60;

export function toTeamsRequest(info: TeamsHostInfo, now: Date): CreateSeriesRequest {
  const { meeting } = info;
  const start = meeting?.start ?? now;
  const minutes =
    meeting?.start && meeting.end
      ? Math.round((meeting.end.getTime() - meeting.start.getTime()) / 60_000)
      : DEFAULT_MINUTES;
  const externalKey = teamsExternalKey(info);
  return {
    ...(meeting?.title ? { title: meeting.title.slice(0, 200) } : {}),
    start: Math.floor(start.getTime() / 1000),
    durationMin: Math.min(480, Math.max(5, minutes)),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    source: 'teams',
    ...(externalKey ? { externalKey } : {}),
  };
}
