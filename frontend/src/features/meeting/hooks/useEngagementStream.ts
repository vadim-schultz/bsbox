import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import { getEngagementSummary } from "../api/client";
import { applyDelta } from "../domain/engagement";
import { mapEngagementSummary } from "../domain/mappers";
import type { EngagementSummary } from "../types/domain";
import type { EngagementMessage } from "../types/ws";
import { buildWebSocketUrl } from "../services/ws";

export function useEngagementStream(meetingId?: string | null) {
  const [summary, setSummary] = useState<EngagementSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const summaryRef = useRef<EngagementSummary | null>(null);

  // Keep summary ref up-to-date for use in callbacks
  useEffect(() => {
    summaryRef.current = summary;
  }, [summary]);

  // Disconnect and clean up WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Connect to WebSocket with reconnection logic
  const connect = useCallback((id: string) => {
    // Skip if already connected or connecting
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
      setError(null);
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed: EngagementMessage = JSON.parse(event.data);

        // Ignore pong messages
        if (parsed.type === "pong") return;

        if (parsed.type === "snapshot") {
          setSummary(mapEngagementSummary(parsed.data as Parameters<typeof mapEngagementSummary>[0]));
        } else if (parsed.type === "delta") {
          setSummary((prev) => (prev ? applyDelta(prev, parsed.data) : prev));
        }
      } catch (err) {
        console.error("[WS] Failed to parse message:", err);
      }
    };

    ws.onclose = (event) => {
      console.log("[WS] Connection closed:", event.code, event.reason);
      wsRef.current = null;

      // Schedule reconnect after 3 seconds
      console.log("[WS] Scheduling reconnect in 3s");
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect(id);
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error("[WS] Error:", error);
      // Let onclose handle reconnect
      ws.close();
    };
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

  // Connect/disconnect WebSocket based on meetingId
  useEffect(() => {
    if (meetingId) {
      connect(meetingId);
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // Only reconnect when meetingId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  return useMemo(
    () => ({
      summary,
      loading,
      error,
    }),
    [summary, loading, error]
  );
}
