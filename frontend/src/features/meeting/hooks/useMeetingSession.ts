import { useCallback, useEffect, useState } from "react";

import { mapVisitResponse } from "../domain/mappers";
import { visit } from "../api/client";
import { clearSession, loadSessionAsync } from "../services/session";
import type { VisitSession } from "../types/domain";

type Options = {
  initialSession?: VisitSession | null;
  autoVisit?: boolean;
};

export function useMeetingSession(options?: Options) {
  const [session, setSession] = useState<VisitSession | null>(options?.initialSession ?? null);
  const [loading, setLoading] = useState(!options?.initialSession);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = await loadSessionAsync();
      const response = await visit({ deviceFingerprint: stored.deviceFingerprint ?? "" });
      const mapped = mapVisitResponse(response);
      setSession(mapped);
    } catch (err) {
      clearSession();
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
