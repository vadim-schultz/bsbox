import type { SessionInfo } from '@bsbox/shared';

export interface NewSession {
  code: string;
  sessionId: string;
  start: number;
  end: number;
  editToken?: string;
}

export interface SeriesSpec {
  title: string;
  /** Seconds from now until the first session starts (may be negative). */
  startInSec: number;
  durationMin: number;
  rrule?: string;
}

const nowS = (): number => Math.floor(Date.now() / 1000);

export const post = (api: string, body: unknown, path = '/api/series'): Promise<Response> =>
  fetch(`${api}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

/** Creates a series, then reads it once: that read creates the session row lazily. */
export async function createSession(api: string, spec: SeriesSpec): Promise<NewSession> {
  const { startInSec, ...rest } = spec;
  const res = await post(api, { ...rest, start: nowS() + startInSec, tz: 'UTC', source: 'web' });
  if (res.status !== 201) throw new Error(`series create failed: ${res.status}`);
  const created = (await res.json()) as { code: string; editToken?: string };
  const view = await fetch(`${api}/api/series/${created.code}`);
  if (!view.ok) throw new Error(`series read failed: ${view.status}`);
  const session = ((await view.json()) as { session: SessionInfo }).session;
  return { ...created, sessionId: session.id, start: session.start, end: session.end };
}

export const wsUrl = (api: string, sessionId: string): string =>
  `${api.replace(/^http/, 'ws')}/api/sessions/${encodeURIComponent(sessionId)}/ws`;
