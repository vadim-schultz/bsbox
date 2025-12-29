import { useCallback, useEffect, useMemo, useState } from "react";

import { getMeeting } from "../api/client";
import { deriveParticipantStatus, mapMeeting } from "../domain/mappers";
import type { StatusLiteral } from "../types/dto";
import type { Meeting } from "../types/domain";

type Params = {
  meetingId?: string | null;
  participantId?: string | null;
};

export function useMeetingData({ meetingId, participantId }: Params) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMeeting = useCallback(
    async (targetId?: string | null) => {
      const idToUse = targetId ?? meetingId;
      if (!idToUse) return;

      setLoading(true);
      setError(null);
      try {
        const detail = await getMeeting(idToUse);
        setMeeting(mapMeeting(detail));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load meeting");
      } finally {
        setLoading(false);
      }
    },
    [meetingId]
  );

  useEffect(() => {
    if (meetingId) {
      void refreshMeeting(meetingId);
    }
  }, [meetingId, refreshMeeting]);

  const participantCount = useMemo(
    () => meeting?.participants.length ?? 0,
    [meeting]
  );

  const activeStatus: StatusLiteral = useMemo(
    () =>
      meeting
        ? deriveParticipantStatus(meeting, participantId ?? undefined)
        : "disengaged",
    [meeting, participantId]
  );

  return {
    meeting,
    participantCount,
    activeStatus,
    loading,
    error,
    refreshMeeting,
  };
}
