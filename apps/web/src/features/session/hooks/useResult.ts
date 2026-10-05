import { useEffect, useState } from 'react';
import type { SessionResult } from '@bsbox/shared';
import { ApiError } from '../../../lib';
import { getSession } from '../services';

export type ResultState =
  | { status: 'loading' }
  | { status: 'ready'; result: SessionResult }
  | { status: 'error'; kind: 'expired' | 'failed' };

/** A pushed `ended` result renders at once; otherwise the result is fetched by session id. */
export function useResult(sessionId: string, pushed: SessionResult | null): ResultState {
  const [fetched, setFetched] = useState<ResultState>({ status: 'loading' });

  useEffect(() => {
    if (pushed) return;
    const controller = new AbortController();
    setFetched({ status: 'loading' });
    getSession(sessionId, controller.signal)
      .then((s) =>
        setFetched(
          s.result ? { status: 'ready', result: s.result } : { status: 'error', kind: 'failed' },
        ),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const expired =
          error instanceof ApiError && (error.status === 410 || error.code === 'session_expired');
        setFetched({ status: 'error', kind: expired ? 'expired' : 'failed' });
      });
    return () => controller.abort();
  }, [sessionId, pushed]);

  return pushed ? { status: 'ready', result: pushed } : fetched;
}
