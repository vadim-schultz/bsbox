/**
 * Hook for the complete meeting experience.
 *
 * Combines session management with WebSocket-based real-time communication.
 * All meeting data (participant, engagement, status) flows through WebSocket.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useMeetingSession } from "./useMeetingSession";
import { useMeetingSocket } from "./useMeetingSocket";
import { getDeviceFingerprint } from "../services/deviceFingerprint";
import type { VisitSession, MeetingTimes } from "../types/domain";
import type { StatusLiteral } from "../types/dto";

export function useMeetingExperience(initialSession?: VisitSession | null) {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [fingerprintError, setFingerprintError] = useState<string | null>(null);

  // Session from initial visit (provides meetingId and display metadata)
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
  } = useMeetingSession({ initialSession, autoVisit: false });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const fp = await getDeviceFingerprint();
        if (!cancelled) {
          setFingerprint(fp);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Unable to obtain device fingerprint";
          setFingerprintError(message);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // WebSocket connection for real-time data
  const {
    participantId,
    summary: engagementSummary,
    currentStatus: activeStatus,
    connectionState,
    meetingEnded,
    meetingNotStarted,
    countdownData,
    summaryData,
    error: socketError,
    loading: socketLoading,
    sendStatus: wsSendStatus,
  } = useMeetingSocket(session?.meetingId, fingerprint);

  // Wrap sendStatus to be async-compatible for the UI
  const sendStatus = useCallback(
    async (status: StatusLiteral): Promise<void> => {
      wsSendStatus(status);
    },
    [wsSendStatus]
  );

  // Derive meeting times from session or engagement summary
  const meetingTimes: MeetingTimes | undefined = useMemo(() => {
    if (session?.meetingTimes) {
      return session.meetingTimes;
    }
    if (engagementSummary) {
      return {
        start: engagementSummary.start,
        end: engagementSummary.end,
      };
    }
    return undefined;
  }, [session, engagementSummary]);

  const fingerprintLoading = fingerprint === null && !fingerprintError;
  const loading = sessionLoading || socketLoading || fingerprintLoading;
  const error = fingerprintError ?? sessionError ?? socketError ?? null;
  const participantCount = engagementSummary?.participants.length ?? 0;
  const isCountdownMode = !!countdownData && !participantId;

  return {
    // Meeting metadata (from session)
    meetingId: session?.meetingId ?? null,
    meetingTimes,
    cityName: session?.cityName ?? null,
    meetingRoomName: session?.meetingRoomName ?? null,
    msTeamsInput: session?.msTeamsInput ?? null,
    // Real-time data (from WebSocket)
    participantId,
    participantCount,
    engagementSummary,
    activeStatus,
    // Countdown mode
    isCountdownMode,
    countdownData,
    // Summary data (when meeting ends)
    summaryData,
    // Connection state
    connectionState,
    meetingEnded,
    meetingNotStarted,
    loading,
    error,
    // Actions
    sendStatus,
  };
}
