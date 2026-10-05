import {
  createSeriesResponseSchema,
  type CreateSeriesRequest,
  type CreateSeriesResponse,
} from '@bsbox/shared';
import { API_BASE, http } from '../../../lib';

export function createSeries(body: CreateSeriesRequest): Promise<CreateSeriesResponse> {
  return http(`${API_BASE}/series`, {
    method: 'POST',
    body,
    schema: createSeriesResponseSchema,
  });
}

export function syncSeries(
  code: string,
  editToken: string,
  body: Partial<Omit<CreateSeriesRequest, 'source' | 'externalKey'>>,
): Promise<void> {
  return http<void>(`${API_BASE}/series/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    body,
    headers: { 'X-Edit-Token': editToken },
  });
}
