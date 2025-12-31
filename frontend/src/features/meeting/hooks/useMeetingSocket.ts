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
import { useCountdownTimer } from "./useCountdownTimer";
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
  /** Countdown data (if meeting hasn't started) */
  countdownData: {
    startTime: string;
    serverTime: string;
    cityName?: string | null;
    meetingRoomName?: string | null;
  } | null;
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
  const [countdownData, setCountdownData] = useState<{
    startTime: string;
    serverTime: string;
    cityName?: string | null;
    meetingRoomName?: string | null;
  } | null>(null);
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
      setCountdownData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const socket = new MeetingSocket();
    socketRef.current = socket;
    let hasReceivedCountdown = false;

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

    const unsubCountdown = socket.onCountdown((data) => {
      console.log("[useMeetingSocket] Countdown received:", data);
      hasReceivedCountdown = true;
      setCountdownData({
        startTime: data.start_time,
        serverTime: data.server_time,
        cityName: data.city_name,
        meetingRoomName: data.meeting_room_name,
      });
      setError(null);
      setLoading(false); // Stop loading since we're in countdown mode
    });

    const unsubError = socket.onError((message) => {
      setError(message);
    });

    const unsubState = socket.onStateChange((state) => {
      setConnectionState(state);
    });

    // Connect and conditionally join
    const init = async () => {
      setLoading(true);
      setError(null);

      try {
        await socket.connect(meetingId);
        
        // Wait briefly to see if we receive a countdown message
        await new Promise((resolve) => setTimeout(resolve, 200));
        
        // Only try to join if we didn't receive countdown message
        if (!hasReceivedCountdown) {
          try {
            const pid = await socket.join(deviceFingerprint);
            participantIdRef.current = pid;
            setParticipantId(pid);
            setCountdownData(null);
          } catch (joinErr) {
            const message = joinErr instanceof Error ? joinErr.message : "Join failed";
            console.error("[useMeetingSocket] Join failed:", message);
            setError(message);
          }
        } else {
          console.log("[useMeetingSocket] Countdown mode - deferring join");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Connection failed";
        setError(message);
        console.error("[useMeetingSocket] Init failed:", err);
      } finally {
        if (!hasReceivedCountdown) {
          setLoading(false);
        }
      }
    };

    void init();

    // Cleanup on unmount or meetingId change
    return () => {
      unsubSnapshot();
      unsubDelta();
      unsubEnded();
      unsubNotStarted();
      unsubCountdown();
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

  // Auto-join when countdown completes
  const { isComplete: countdownComplete } = useCountdownTimer(
    countdownData?.startTime ?? null,
    countdownData?.serverTime ?? null
  );

  useEffect(() => {
    if (countdownComplete && countdownData && deviceFingerprint && !participantId) {
      console.log("[useMeetingSocket] Countdown complete, attempting auto-join");
      const socket = socketRef.current;
      if (!socket) {
        console.error("[useMeetingSocket] Socket not available for auto-join");
        return;
      }

      // Check if socket is still connected
      if (socket.getConnectionState() !== "connected") {
        console.log("[useMeetingSocket] Socket not connected, reconnecting...");
        setLoading(true);
        socket
          .connect(meetingId!)
          .then(() => {
            console.log("[useMeetingSocket] Reconnected, attempting join");
            return socket.join(deviceFingerprint);
          })
          .then((pid) => {
            participantIdRef.current = pid;
            setParticipantId(pid);
            setCountdownData(null);
            console.log("[useMeetingSocket] Auto-join successful:", pid);
          })
          .catch((err) => {
            const message = err instanceof Error ? err.message : "Auto-join failed";
            setError(message);
            console.error("[useMeetingSocket] Auto-join failed:", err);
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        // Socket is connected, just join
        setLoading(true);
        socket
          .join(deviceFingerprint)
          .then((pid) => {
            participantIdRef.current = pid;
            setParticipantId(pid);
            setCountdownData(null);
            console.log("[useMeetingSocket] Auto-join successful:", pid);
          })
          .catch((err) => {
            const message = err instanceof Error ? err.message : "Auto-join failed";
            setError(message);
            console.error("[useMeetingSocket] Auto-join failed:", err);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [countdownComplete, countdownData, deviceFingerprint, participantId, meetingId]);

  return useMemo(
    () => ({
      participantId,
      summary,
      currentStatus,
      connectionState,
      meetingEnded,
      meetingNotStarted,
      countdownData,
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
      countdownData,
      error,
      loading,
      sendStatus,
      disconnect,
    ]
  );
}
