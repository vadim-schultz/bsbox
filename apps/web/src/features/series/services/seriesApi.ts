import { seriesResponseSchema, type SeriesResponse } from '@bsbox/shared';
import { API_BASE, http } from '../../../lib';

export function getSeries(code: string, signal?: AbortSignal): Promise<SeriesResponse> {
  return http(`${API_BASE}/series/${encodeURIComponent(code)}`, {
    schema: seriesResponseSchema,
    signal,
  });
}
