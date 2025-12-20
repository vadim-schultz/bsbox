import { Stack, Text } from "@chakra-ui/react";
import { useMemo } from "react";

import { useMeetingExperience } from "../hooks/useMeetingExperience";
import { useEngagementStream } from "../hooks/useEngagementStream";
import { buildChartData } from "../domain/engagement";
import { formatTimespan } from "../utils/time";
import { ErrorNotice, LoadingState } from "../components/feedback";
import { MeetingInfo } from "../components/meeting-info";
import { StatusSelector } from "../components/cards";
import { EngagementChart } from "../components/charts/EngagementChart";

export function MeetingContainer() {
  const {
    meeting,
    meetingTimes,
    meetingId,
    participantCount,
    activeStatus,
    loading,
    error,
    sendStatus,
  } = useMeetingExperience();
  const {
    summary: engagementSummary,
    loading: engagementLoading,
    error: engagementError,
  } = useEngagementStream(meetingId);

  const displayParticipantCount =
    engagementSummary?.participants.length ?? participantCount;

  // Prepare chart data in the container (business logic)
  const chartData = useMemo(
    () => buildChartData(meeting, engagementSummary),
    [meeting, engagementSummary]
  );

  const handleToggle = async (status: "speaking" | "engaged") => {
    if (activeStatus === status) {
      await sendStatus("not_engaged");
      return;
    }
    await sendStatus(status);
  };

  return (
    <Stack gap={6}>
      <MeetingInfo
        meetingLabel={formatTimespan(meetingTimes?.start, meetingTimes?.end)}
        participantCount={displayParticipantCount}
      />

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <LoadingState label="Loading meeting..." />
      ) : (
        <StatusSelector activeStatus={activeStatus} onToggle={handleToggle} />
      )}

      {!loading && !error && (
        <Text color="muted" fontSize="sm">
          Click a card to activate it. Clicking an active card deactivates it.
        </Text>
      )}

      <EngagementChart
        data={chartData}
        windowMinutes={engagementSummary?.windowMinutes}
        bucketMinutes={engagementSummary?.bucketMinutes}
        loading={engagementLoading}
        error={engagementError}
      />
    </Stack>
  );
}
