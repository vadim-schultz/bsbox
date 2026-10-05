import {
  seriesResponseSchema,
  sessionListResponseSchema,
  type SeriesResponse,
} from '@bsbox/shared';
import type { z } from 'zod';
import { API_BASE, http } from '../../../lib';

export type SessionList = z.infer<typeof sessionListResponseSchema>;

export function getSeries(code: string, signal?: AbortSignal): Promise<SeriesResponse> {
  return http(`${API_BASE}/series/${encodeURIComponent(code)}`, {
    schema: seriesResponseSchema,
    signal,
  });
}

export function listSessions(code: string, signal?: AbortSignal): Promise<SessionList> {
  return http(`${API_BASE}/sessions?series=${encodeURIComponent(code)}`, {
    schema: sessionListResponseSchema,
    signal,
  });
}
