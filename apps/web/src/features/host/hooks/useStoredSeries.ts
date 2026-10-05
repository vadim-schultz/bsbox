import { useEffect, useState } from 'react';
import { isHostAvailable, loadStored } from '../services';
import type { ReadState } from '../types';
import { joinUrlFor } from '../utils';

/** Read surface: finds the series attached to the open appointment. */
export function useStoredSeries(): ReadState {
  const [state, setState] = useState<ReadState>(
    isHostAvailable() ? { status: 'loading' } : { status: 'unavailable' },
  );
  useEffect(() => {
    if (!isHostAvailable()) return;
    let live = true;
    loadStored()
      .then((found) => {
        if (!live) return;
        setState(
          found
            ? {
                status: 'found',
                code: found.code,
                joinUrl: joinUrlFor(location.origin, found.code),
              }
            : { status: 'none' },
        );
      })
      .catch(() => live && setState({ status: 'none' }));
    return () => {
      live = false;
    };
  }, []);
  return state;
}
