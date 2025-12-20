import { useMemo } from "react";

import { useMeetingData } from "./useMeetingData";
import { useMeetingSession } from "./useMeetingSession";
import { useStatusActions } from "./useStatusActions";

export function useMeetingExperience() {
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
  } = useMeetingSession();

  const {
    meeting,
    participantCount,
    activeStatus: derivedStatus,
    loading: meetingLoading,
    error: meetingError,
    refreshMeeting,
  } = useMeetingData({
    meetingId: session?.meetingId,
    participantId: session?.participantId,
  });

  const {
    activeStatus,
    sendStatus,
    loading: statusUpdating,
    error: statusError,
  } = useStatusActions({
    meetingId: session?.meetingId,
    participantId: session?.participantId,
    initialStatus: derivedStatus,
    onStatusUpdated: refreshMeeting,
  });

  const loading = sessionLoading || meetingLoading || statusUpdating;
  const error = sessionError ?? meetingError ?? statusError ?? null;

  return {
    meeting,
    meetingTimes: useMemo(
      () =>
        meeting
          ? { start: meeting.start, end: meeting.end }
          : session?.meetingTimes,
      [meeting, session]
    ),
    meetingId: session?.meetingId ?? null,
    participantCount,
    activeStatus,
    loading,
    error,
    sendStatus,
    refreshMeeting,
  };
}
