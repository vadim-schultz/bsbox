import { useCallback, useEffect, useState } from 'react';
import { getSeries } from '../services';
import type { SeriesState } from '../types';
import { toErrorKind } from '../utils';

/** Loads a series by code; `offsetMs` is server time minus device time at fetch. */
export function useSeries(code: string) {
  const [state, setState] = useState<SeriesState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    getSeries(code, controller.signal)
      .then((data) =>
        setState({ status: 'ready', data, offsetMs: data.serverTime * 1000 - Date.now() }),
      )
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', kind: toErrorKind(error) });
      });
    return () => controller.abort();
  }, [code, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { state, retry };
}
