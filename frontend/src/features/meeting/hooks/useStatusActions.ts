import { useCallback, useEffect, useState } from "react";

import { updateStatus } from "../api/client";
import type { StatusLiteral } from "../types/dto";

type Params = {
  meetingId?: string | null;
  participantId?: string | null;
  initialStatus: StatusLiteral;
  onStatusUpdated?: (meetingId?: string | null) => Promise<void> | void;
};

const DEFAULT_STATUS: StatusLiteral = "disengaged";

export function useStatusActions({
  meetingId,
  participantId,
  initialStatus,
  onStatusUpdated,
}: Params) {
  const [activeStatus, setActiveStatus] = useState<StatusLiteral>(
    initialStatus ?? DEFAULT_STATUS
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveStatus(initialStatus ?? DEFAULT_STATUS);
  }, [initialStatus]);

  const sendStatus = useCallback(
    async (status: StatusLiteral) => {
      if (!meetingId || !participantId) return;
      setLoading(true);
      setError(null);
      try {
        await updateStatus({ meetingId, participantId, status });
        setActiveStatus(status);
        if (onStatusUpdated) {
          await onStatusUpdated(meetingId);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to update status"
        );
      } finally {
        setLoading(false);
      }
    },
    [meetingId, participantId, onStatusUpdated]
  );

  return {
    activeStatus,
    sendStatus,
    loading,
    error,
  };
}
