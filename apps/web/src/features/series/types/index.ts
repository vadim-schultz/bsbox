import type { SeriesResponse } from '@bsbox/shared';

export type SeriesErrorKind = 'series_not_found' | 'session_expired' | 'network' | 'internal_error';

export type SeriesState =
  | { status: 'loading' }
  | { status: 'ready'; data: SeriesResponse; offsetMs: number }
  | { status: 'error'; kind: SeriesErrorKind };
