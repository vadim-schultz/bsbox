/**
 * Hook for managing meeting session state.
 *
 * With the new WebSocket architecture, this hook mainly handles
 * session state from the selection flow. Participant creation
 * happens via WebSocket join.
 */

import { useCallback, useEffect, useState } from "react";

import { mapVisitResponse } from "../domain/mappers";
import { visit } from "../api/client";
import type { VisitSession } from "../types/domain";

type Options = {
  initialSession?: VisitSession | null;
  autoVisit?: boolean;
};

export function useMeetingSession(options?: Options) {
  const [session, setSession] = useState<VisitSession | null>(
    options?.initialSession ?? null
  );
  const [loading, setLoading] = useState(!options?.initialSession);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Visit endpoint returns meeting info (no participant creation)
      const response = await visit({});
      const mapped = mapVisitResponse(response);
      setSession(mapped);
    } catch (err) {
      setSession(null);
      setError(
        err instanceof Error ? err.message : "Unable to load meeting session"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options?.initialSession) {
      setSession(options.initialSession);
      setLoading(false);
      return;
    }
    if (options?.autoVisit === false) {
      setLoading(false);
      return;
    }
    void bootstrap();
  }, [bootstrap, options?.initialSession, options?.autoVisit]);

  return {
    session,
    loading,
    error,
  };
}
