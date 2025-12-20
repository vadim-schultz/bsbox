import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import { getEngagementSummary } from "../api/client";
import { applyDelta } from "../domain/engagement";
import { mapEngagementSummary } from "../domain/mappers";
import type { EngagementSummary } from "../types/domain";
import type { EngagementMessage } from "../types/ws";
import { buildWebSocketUrl } from "../services/ws";

type ParsedMessage =
  | { type: "snapshot"; data: EngagementMessage["data"] }
  | { type: "delta"; data: EngagementMessage["data"] }
  | { type: "pong" };

function parseEngagementMessage(eventData: MessageEvent["data"]): ParsedMessage | null {
  try {
    const parsed: EngagementMessage = JSON.parse(eventData as string);
    if (parsed.type === "pong") return { type: "pong" };
    if (parsed.type === "snapshot" || parsed.type === "delta") {
      return { type: parsed.type, data: parsed.data };
    }
    return null;
  } catch (err) {
    console.error("[WS] Failed to parse message:", err);
    return null;
  }
}

function useEngagementPolling(
  meetingId: string | null | undefined,
  refreshSummary: (id: string) => void,
  intervalMs = 5000
) {
  const pollIntervalRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      if (pollIntervalRef.current !== null) {
        window.clearInterval(pollIntervalRef.current);
      }
      pollIntervalRef.current = window.setInterval(() => {
        refreshSummary(id);
      }, intervalMs);
    },
    [refreshSummary, intervalMs]
  );

  useEffect(() => {
    if (!meetingId) {
      stopPolling();
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startPolling(meetingId);
        refreshSummary(meetingId);
      } else {
        stopPolling();
      }
    };

    startPolling(meetingId);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [meetingId, refreshSummary, startPolling, stopPolling]);
}

function useEngagementWebSocket(
  meetingId: string | null | undefined,
  handlers: {
    onSnapshot: (data: EngagementMessage["data"]) => void;
    onDelta: (data: EngagementMessage["data"]) => void;
    onConnect?: () => void;
    onError?: (message: string) => void;
  }
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
  }, []);

  const connect = useCallback(
    (id: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log("[WS] Already connected, skipping");
        return;
      }
      if (wsRef.current?.readyState === WebSocket.CONNECTING) {
        console.log("[WS] Already connecting, skipping");
        return;
      }

      console.log("[WS] Connecting to meeting:", id);
      const url = buildWebSocketUrl(`/ws/meetings/${id}`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected successfully for meeting:", id);
        handlers.onConnect?.();
        reconnectAttemptsRef.current = 0;
        clearReconnectTimer();
      };

      ws.onmessage = (event: MessageEvent) => {
        const parsed = parseEngagementMessage(event.data);
        if (!parsed || parsed.type === "pong") return;
        if (parsed.type === "snapshot") {
          handlers.onSnapshot(parsed.data);
        } else if (parsed.type === "delta") {
          handlers.onDelta(parsed.data);
        }
      };

      ws.onclose = (event) => {
        console.log("[WS] Connection closed:", event.code, event.reason);
        wsRef.current = null;
        const attempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempt;
        const baseDelay = Math.min(3000 * 2 ** (attempt - 1), 30000);
        const jitter = Math.floor(Math.random() * 500);
        const delay = baseDelay + jitter;
        clearReconnectTimer();
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect(id);
        }, delay);
      };

      ws.onerror = (error) => {
        console.error("[WS] Error:", error);
        handlers.onError?.("WebSocket connection error");
        ws.close();
      };
    },
    [handlers]
  );

  useEffect(() => {
    if (meetingId) {
      connect(meetingId);
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [meetingId, connect, disconnect]);

  return { disconnect };
}

export function useEngagementStream(meetingId?: string | null) {
  const [summary, setSummary] = useState<EngagementSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSummary = useCallback(async (id: string) => {
    try {
      const latest = await getEngagementSummary(id);
      setSummary(mapEngagementSummary(latest));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load engagement data");
    }
  }, []);

  // Fetch initial engagement summary via HTTP
  useEffect(() => {
    if (!meetingId) {
      setSummary(null);
      setError(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSummary(null);

    void getEngagementSummary(meetingId)
      .then((res) => {
        if (cancelled) return;
        setSummary(mapEngagementSummary(res));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load engagement data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  const handleSnapshot = useCallback((data: EngagementMessage["data"]) => {
    setSummary(mapEngagementSummary(data as Parameters<typeof mapEngagementSummary>[0]));
    setError(null);
  }, []);

  const handleDelta = useCallback((data: EngagementMessage["data"]) => {
    setSummary((prev) => (prev ? applyDelta(prev, data) : prev));
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  const wsHandlers = useMemo(
    () => ({
      onSnapshot: handleSnapshot,
      onDelta: handleDelta,
      onConnect: () => setError(null),
      onError: handleError,
    }),
    [handleDelta, handleSnapshot, handleError]
  );

  useEngagementPolling(meetingId ?? null, (id) => {
    void refreshSummary(id);
  });

  useEngagementWebSocket(meetingId ?? null, wsHandlers);

  return useMemo(
    () => ({
      summary,
      loading,
      error,
    }),
    [summary, loading, error]
  );
}
