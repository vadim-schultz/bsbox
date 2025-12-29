import { Button, Flex, Stack, Text } from "@chakra-ui/react";
import { useMemo } from "react";

import { useMeetingExperience } from "../hooks/useMeetingExperience";
import { useMeetingDuration } from "../hooks/useMeetingDuration";
import { useEngagementStream } from "../hooks/useEngagementStream";
import { buildChartData } from "../domain/engagement";
import { formatTimespan } from "../utils/time";
import { ErrorNotice, LoadingState } from "../components/feedback";
import { MeetingInfo } from "../components/meeting-info";
import { StatusSelector } from "../components/cards";
import { EngagementChart } from "../components/charts/EngagementChart";
import type { VisitSession } from "../types/domain";

type Props = {
  initialSession?: VisitSession | null;
  onBackToSelection?: () => void;
};

export function MeetingContainer({ initialSession, onBackToSelection }: Props) {
  const {
    meeting,
    meetingTimes,
    meetingId,
    participantCount,
    activeStatus,
    loading,
    error,
    sendStatus,
    refreshMeeting,
  } = useMeetingExperience(initialSession);

  const { isLocked, durationMinutes, updateDuration } = useMeetingDuration({
    meetingId,
    meetingTimes,
    onDurationUpdated: () => refreshMeeting(meetingId),
  });

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
      await sendStatus("disengaged");
      return;
    }
    await sendStatus(status);
  };

  return (
    <Stack gap={6}>
      {onBackToSelection && (
        <Flex justify="flex-start">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToSelection}
          >
            ← Change Location
          </Button>
        </Flex>
      )}
      
      <MeetingInfo
        meetingLabel={formatTimespan(meetingTimes?.start, meetingTimes?.end)}
        meetingStart={meetingTimes?.start}
        meetingEnd={meetingTimes?.end}
        currentDurationMinutes={durationMinutes ?? 60}
        onDurationChange={updateDuration}
        durationLocked={isLocked}
        participantCount={displayParticipantCount}
        cityName={meeting?.cityName ?? null}
        meetingRoomName={meeting?.meetingRoomName ?? null}
        msTeamsMeetingId={meeting?.msTeamsMeetingId ?? null}
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
