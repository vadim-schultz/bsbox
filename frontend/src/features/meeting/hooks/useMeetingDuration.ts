import { useCallback, useMemo, useState } from "react";

import { updateMeetingDuration } from "../api/client";
import type { MeetingTimes } from "../types/domain";

type Params = {
  meetingId: string | null;
  meetingTimes: MeetingTimes | undefined;
  onDurationUpdated?: () => void | Promise<void>;
};

export function useMeetingDuration({
  meetingId,
  meetingTimes,
  onDurationUpdated,
}: Params) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationMinutes = useMemo(() => {
    if (!meetingTimes?.start || !meetingTimes?.end) return null;
    return Math.round(
      (meetingTimes.end.getTime() - meetingTimes.start.getTime()) / 60000
    );
  }, [meetingTimes]);

  const isLocked = durationMinutes !== null && durationMinutes !== 60;

  const updateDuration = useCallback(
    async (minutes: 30 | 60) => {
      if (!meetingId) {
        setError("No meeting ID available");
        return;
      }

      setUpdating(true);
      setError(null);

      try {
        await updateMeetingDuration({
          meetingId,
          data: { duration_minutes: minutes },
        });
        await onDurationUpdated?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update duration"
        );
        throw err;
      } finally {
        setUpdating(false);
      }
    },
    [meetingId, onDurationUpdated]
  );

  return {
    durationMinutes,
    isLocked,
    updating,
    error,
    updateDuration,
  };
}
