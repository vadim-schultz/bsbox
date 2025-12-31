/**
 * React hook for WebSocket-based meeting communication.
 *
 * Provides unified access to meeting data, engagement updates, and status actions.
 * Uses connection-based identity (no fingerprints).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MeetingSocket } from "../services/meetingSocket";
import { applyDelta } from "../domain/engagement";
import { mapEngagementSummary } from "../domain/mappers";
import { toLocalDate } from "../utils/time";
import type { EngagementSummary } from "../types/domain";
import type { EngagementSummaryDto, StatusLiteral } from "../types/dto";
import type { DeltaMessageData } from "../types/ws";

type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "ended"
  | "not_started";

type UseMeetingSocketResult = {
  /** Current participant ID (null until joined) */
  participantId: string | null;
  /** Engagement summary data */
  summary: EngagementSummary | null;
  /** Current user's engagement status */
  currentStatus: StatusLiteral;
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether meeting has ended */
  meetingEnded: boolean;
  /** Whether meeting has not started yet */
  meetingNotStarted: boolean;
  /** Error message if any */
  error: string | null;
  /** Loading state (connecting or joining) */
  loading: boolean;
  /** Send a status update */
  sendStatus: (status: StatusLiteral) => void;
  /** Disconnect from the meeting */
  disconnect: () => void;
};

/**
 * Hook for managing WebSocket connection to a meeting.
 *
 * @param meetingId - The meeting ID to connect to (null/undefined to not connect)
 * @returns Meeting socket state and actions
 */
export function useMeetingSocket(
  meetingId: string | null | undefined,
  deviceFingerprint: string | null | undefined
): UseMeetingSocketResult {
  const socketRef = useRef<MeetingSocket | null>(null);
  const participantIdRef = useRef<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [summary, setSummary] = useState<EngagementSummary | null>(null);
  const [currentStatus, setCurrentStatus] = useState<StatusLiteral>("disengaged");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [meetingNotStarted, setMeetingNotStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize socket and handlers
  useEffect(() => {
    if (!meetingId || !deviceFingerprint) {
      // Reset state when meetingId is cleared
      participantIdRef.current = null;
      setParticipantId(null);
      setSummary(null);
      setCurrentStatus("disengaged");
      setConnectionState("disconnected");
      setMeetingEnded(false);
      setMeetingNotStarted(false);
      setError(null);
      setLoading(false);
      return;
    }

    const socket = new MeetingSocket();
    socketRef.current = socket;

    // Register handlers
    const unsubSnapshot = socket.onSnapshot((data) => {
      try {
        const mapped = mapEngagementSummary(data as EngagementSummaryDto);
        setSummary(mapped);
        setError(null);
      } catch (err) {
        console.error("[useMeetingSocket] Failed to map snapshot:", err);
      }
    });

    const unsubDelta = socket.onDelta((data) => {
      const delta = data as DeltaMessageData;
      setSummary((prev) => {
        if (!prev) {
          // Seed minimal summary if snapshot didn't arrive yet
          const bucket = toLocalDate(delta.bucket);
          const participants = Object.entries(delta.participants).map(
            ([participantId, value]) => ({
              participantId,
              deviceFingerprint: "",
              series: [{ bucket, value }],
            })
          );
          return {
            meetingId: delta.meeting_id,
            start: bucket,
            end: bucket,
            bucketMinutes: 1,
            windowMinutes: 5,
            overall: [{ bucket, value: delta.overall }],
            participants,
          };
        }
        try {
          return applyDelta(prev, delta);
        } catch (err) {
          console.error("[useMeetingSocket] Failed to apply delta:", err);
          return prev;
        }
      });
      // Update currentStatus if this delta is for our participant
      if (delta.participant_id === participantIdRef.current) {
        setCurrentStatus(delta.status);
      }
    });

    const unsubEnded = socket.onMeetingEnded((message) => {
      setMeetingEnded(true);
      setConnectionState("ended");
      if (message) {
        setError(message);
      }
    });

    const unsubNotStarted = socket.onMeetingNotStarted((message) => {
      setMeetingNotStarted(true);
      setConnectionState("not_started");
      if (message) {
        setError(message);
      }
    });

    const unsubError = socket.onError((message) => {
      setError(message);
    });

    const unsubState = socket.onStateChange((state) => {
      setConnectionState(state);
    });

    // Connect and join
    const init = async () => {
      setLoading(true);
      setError(null);

      try {
        await socket.connect(meetingId);
        const pid = await socket.join(deviceFingerprint);
        participantIdRef.current = pid;
        setParticipantId(pid);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Connection failed";
        setError(message);
        console.error("[useMeetingSocket] Init failed:", err);
      } finally {
        setLoading(false);
      }
    };

    void init();

    // Cleanup on unmount or meetingId change
    return () => {
      unsubSnapshot();
      unsubDelta();
      unsubEnded();
      unsubNotStarted();
      unsubError();
      unsubState();
      socket.disconnect();
      socketRef.current = null;
      participantIdRef.current = null;
    };
  }, [meetingId, deviceFingerprint]);

  const sendStatus = useCallback((status: StatusLiteral) => {
    socketRef.current?.sendStatus(status);
    // Optimistically update status immediately for responsive UI
    setCurrentStatus(status);
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    setConnectionState("disconnected");
  }, []);

  return useMemo(
    () => ({
      participantId,
      summary,
      currentStatus,
      connectionState,
      meetingEnded,
      meetingNotStarted,
      error,
      loading,
      sendStatus,
      disconnect,
    }),
    [
      participantId,
      summary,
      currentStatus,
      connectionState,
      meetingEnded,
      meetingNotStarted,
      error,
      loading,
      sendStatus,
      disconnect,
    ]
  );
}
