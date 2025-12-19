import { useCallback, useEffect, useState } from "react";

import { mapVisitResponse } from "../domain/mappers";
import { visit } from "../api/client";
import {
  clearSession,
  loadSessionAsync,
} from "../services/session";
import type { VisitSession } from "../types/domain";

export function useMeetingSession() {
  const [session, setSession] = useState<VisitSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = await loadSessionAsync();
      const response = await visit(stored.deviceFingerprint ?? "");
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
    void bootstrap();
  }, [bootstrap]);

  return {
    session,
    loading,
    error,
    refreshSession: bootstrap,
  };
}
