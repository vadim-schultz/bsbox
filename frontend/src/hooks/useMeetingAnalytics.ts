import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { MeetingAnalytics } from "../types/meeting";
import { meetingService } from "../services/meetingService";

const MEETING_QUERY_KEY = ["meeting-analytics"];

const useMeetingAnalytics = () => {
  const queryClient = useQueryClient();

  const { data: analytics } = useQuery({
    queryKey: MEETING_QUERY_KEY,
    queryFn: meetingService.fetchAnalytics,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.EventSource === "undefined") {
      return;
    }
    const source = new EventSource(meetingService.analyticsStreamUrl);
    source.onmessage = (event) => {
      try {
        const payload: MeetingAnalytics = JSON.parse(event.data);
        queryClient.setQueryData(MEETING_QUERY_KEY, payload);
      } catch (error) {
        console.error("Failed to parse analytics stream", error);
      }
    };
    return () => source.close();
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: meetingService.recordEvent,
    onSuccess: (data: MeetingAnalytics) => {
      queryClient.setQueryData(MEETING_QUERY_KEY, data);
    },
  });

  const toggleSpeaking = useCallback(
    (visitorId: string) => {
      const latest = queryClient.getQueryData<MeetingAnalytics>(MEETING_QUERY_KEY);
      const participant = latest?.participants?.find((p) => p.visitorId === visitorId);
      const nextSpeaking = !(participant?.isSpeaking ?? false);
      mutation.mutate({
        visitorId,
        isSpeaking: nextSpeaking,
        isRelevant: participant?.isRelevant ?? false,
      });
    },
    [mutation, queryClient],
  );

  const toggleRelevance = useCallback(
    (visitorId: string) => {
      const latest = queryClient.getQueryData<MeetingAnalytics>(MEETING_QUERY_KEY);
      const participant = latest?.participants?.find((p) => p.visitorId === visitorId);
      const nextRelevance = !(participant?.isRelevant ?? false);
      mutation.mutate({
        visitorId,
        isSpeaking: participant?.isSpeaking ?? false,
        isRelevant: nextRelevance,
      });
    },
    [mutation, queryClient],
  );

  return {
    analytics: analytics ?? null,
    toggleSpeaking,
    toggleRelevance,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};

export default useMeetingAnalytics;

