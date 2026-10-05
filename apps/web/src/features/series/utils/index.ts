import { ApiError } from '../../../lib';
import type { SeriesErrorKind } from '../types';

/** Maps any thrown value to a UI error kind. Fetch failures (TypeError) become `network`. */
export function toErrorKind(error: unknown): SeriesErrorKind {
  if (error instanceof ApiError) {
    if (error.code === 'series_not_found' || error.code === 'not_found') return 'series_not_found';
    if (error.code === 'session_expired' || error.code === 'expired') return 'session_expired';
    return 'internal_error';
  }
  return 'network';
}
