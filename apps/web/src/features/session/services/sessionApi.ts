import { sessionResponseSchema, type SessionResponse } from '@bsbox/shared';
import { API_BASE, http } from '../../../lib';

export function getSession(id: string, signal?: AbortSignal): Promise<SessionResponse> {
  return http(`${API_BASE}/sessions/${encodeURIComponent(id)}`, {
    schema: sessionResponseSchema,
    signal,
  });
}
