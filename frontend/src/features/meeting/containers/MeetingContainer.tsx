import { Button, Flex, Stack, Text } from "@chakra-ui/react";
import { useMemo } from "react";

import { useMeetingExperience } from "../hooks/useMeetingExperience";
import { useMeetingDuration } from "../hooks/useMeetingDuration";
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
    meetingId,
    meetingTimes,
    cityName,
    meetingRoomName,
    msTeamsInput,
    participantCount,
    engagementSummary,
    activeStatus,
    loading,
    error,
    sendStatus,
  } = useMeetingExperience(initialSession);

  const { isLocked, durationMinutes, updateDuration } = useMeetingDuration({
    meetingId,
    meetingTimes,
  });

  // Prepare chart data from engagement summary
  const chartData = useMemo(
    () => buildChartData(null, engagementSummary),
    [engagementSummary]
  );

  const handleToggle = async (status: "speaking" | "engaged") => {
    if (activeStatus === status) {
      await sendStatus("disengaged");
      return;
    }
    await sendStatus(status);
  };

  // Build msTeams display object from input string
  const msTeamsDisplay = msTeamsInput
    ? { inviteUrl: msTeamsInput, threadId: null, meetingId: null }
    : null;

  return (
    <Stack gap={6}>
      {onBackToSelection && (
        <Flex justify="flex-start">
          <Button variant="ghost" size="sm" onClick={onBackToSelection}>
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
        participantCount={participantCount}
        cityName={cityName}
        meetingRoomName={meetingRoomName}
        msTeams={msTeamsDisplay}
      />

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <LoadingState label="Connecting to meeting..." />
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
        loading={loading}
        error={error}
      />
    </Stack>
  );
}
