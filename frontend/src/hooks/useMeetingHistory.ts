import { useQuery } from "@tanstack/react-query";
import { meetingService } from "../services/meetingService";

const MEETING_HISTORY_KEY = ["meeting-history"];

const useMeetingHistory = (limit = 10) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [...MEETING_HISTORY_KEY, limit],
    queryFn: () => meetingService.fetchHistory(limit),
    refetchInterval: 60_000,
  });

  return {
    history: data ?? [],
    isLoading,
    error,
  };
};

export default useMeetingHistory;

