import { useEffect, useState } from 'react';
import { createSeries, loadTeamsHost, onTeamsThemeChange } from '../services';
import type { TeamsPanelState } from '../types';
import { joinUrlFor, toTeamsRequest } from '../utils';

/** Resolves the Teams meeting to a series (idempotent via externalKey) and tracks the theme. */
export function useTeamsPanel(): { state: TeamsPanelState; theme: string | undefined } {
  const [state, setState] = useState<TeamsPanelState>({ status: 'loading' });
  const [theme, setTheme] = useState<string | undefined>();

  useEffect(() => {
    let live = true;
    (async () => {
      const host = await loadTeamsHost();
      if (!live) return;
      if (!host) return setState({ status: 'outside' });
      setTheme(host.context.theme);
      onTeamsThemeChange((next) => live && setTheme(next));
      try {
        const series = await createSeries(toTeamsRequest(host, new Date()));
        if (live) {
          setState({
            status: 'ready',
            code: series.code,
            joinUrl: joinUrlFor(location.origin, series.code),
            host,
          });
        }
      } catch {
        if (live) setState({ status: 'error' });
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  return { state, theme };
}
