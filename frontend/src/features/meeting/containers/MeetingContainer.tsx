import { Button, Flex, Stack, Text } from "@chakra-ui/react";
import { useMemo } from "react";

import { useMeetingExperience } from "../hooks/useMeetingExperience";
import { buildBaselineChart, buildChartData } from "../domain/engagement";
import { formatTimespan } from "../utils/time";
import { Notice, LoadingState } from "../../../app/components/feedback";
import { MeetingInfo } from "../components/MeetingInfo";
import { StatusSelector } from "../components/StatusCards";
import { EngagementChart } from "../components/charts/EngagementChart";
import { MeetingCountdown } from "../components/MeetingCountdown";
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
    meetingEnded,
    meetingNotStarted,
    isCountdownMode,
    countdownData,
    loading,
    error,
    sendStatus,
  } = useMeetingExperience(initialSession);

  // Prepare chart data from engagement summary
  const chartData = useMemo(() => {
    const start = meetingTimes?.start;
    const end = meetingTimes?.end;
    
    if (start && end) {
      // Use buildChartData which now ensures full meeting range is covered
      return buildChartData(start, end, engagementSummary);
    }
    
    // Fallback if meeting times not available yet
    const fallbackStart = new Date(Date.now() - 30 * 60 * 1000);
    const fallbackEnd = new Date(Date.now() + 30 * 60 * 1000);
    return buildBaselineChart(fallbackStart, fallbackEnd);
  }, [engagementSummary, meetingTimes]);

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

  // Show countdown view if in countdown mode
  if (isCountdownMode && countdownData) {
    return (
      <Stack gap={6}>
        {onBackToSelection && (
          <Flex justify="flex-start">
            <Button variant="ghost" size="sm" onClick={onBackToSelection}>
              ← Change Location
            </Button>
          </Flex>
        )}

        <MeetingCountdown
          startTime={countdownData.startTime}
          serverTime={countdownData.serverTime}
          cityName={countdownData.cityName || cityName}
          meetingRoomName={countdownData.meetingRoomName || meetingRoomName}
        />
      </Stack>
    );
  }

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
        participantCount={participantCount}
        cityName={cityName}
        meetingRoomName={meetingRoomName}
        msTeams={msTeamsDisplay}
      />

      {error ? (
        <Notice
          status="error"
          message={error}
          title={
            meetingEnded
              ? "Meeting Ended"
              : meetingNotStarted
                ? "Meeting Not Started"
                : "Connection Error"
          }
        />
      ) : loading ? (
        <LoadingState label="Connecting to meeting..." />
      ) : meetingEnded || meetingNotStarted ? (
        <Notice
          status="error"
          message={
            meetingEnded
              ? "This meeting has ended. Status updates are no longer possible."
              : "This meeting has not started yet. Status updates are not yet possible."
          }
          title={meetingEnded ? "Meeting Ended" : "Meeting Not Started"}
        />
      ) : (
        <>
          <StatusSelector activeStatus={activeStatus} onToggle={handleToggle} />
          <Text color="muted" fontSize="sm">
            Click a card to activate it. Clicking an active card deactivates it.
          </Text>
        </>
      )}

      <EngagementChart
        data={chartData}
        meetingTimes={meetingTimes}
        windowMinutes={engagementSummary?.windowMinutes}
        bucketMinutes={engagementSummary?.bucketMinutes}
        loading={loading}
        error={error}
      />
    </Stack>
  );
}
