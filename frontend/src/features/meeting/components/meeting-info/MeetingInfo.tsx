import { Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { ParticipantBadge } from "./ParticipantBadge";
import { MeetingRangeControl } from "./MeetingRangeControl";
import type { MSTeamsMeeting } from "../../types/domain";

type Props = {
  meetingLabel: string;
  participantCount: number;
  meetingStart?: Date;
  meetingEnd?: Date;
  currentDurationMinutes?: number;
  onDurationChange?: (minutes: 30 | 60) => Promise<void> | void;
  durationLocked?: boolean;
  cityName?: string | null;
  meetingRoomName?: string | null;
  msTeams?: MSTeamsMeeting | null;
};

export function MeetingInfo({
  meetingLabel,
  participantCount,
  meetingStart,
  meetingEnd,
  currentDurationMinutes = 60,
  onDurationChange,
  durationLocked,
  cityName,
  meetingRoomName,
  msTeams,
}: Props) {
  const locationLabel = [cityName, meetingRoomName].filter(Boolean).join(" • ");
  const teamsLabel = msTeams?.meetingId ? `Teams: ${msTeams.meetingId}` : null;

  return (
    <Stack gap={4}>
      <Flex
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "flex-start", md: "center" }}
        gap={3}
      >
        <Stack gap={1}>
          <Heading size="lg">Current meeting</Heading>
          <Text color="muted">{meetingLabel}</Text>
          {locationLabel ? (
            <Text color="muted" fontSize="sm">
              {locationLabel}
            </Text>
          ) : null}
          {teamsLabel ? (
            <Text color="muted" fontSize="sm">
              {teamsLabel}
            </Text>
          ) : null}
        </Stack>
        <ParticipantBadge count={participantCount} />
      </Flex>
      <MeetingRangeControl
        start={meetingStart}
        end={meetingEnd}
        currentDurationMinutes={currentDurationMinutes}
        onDurationChange={onDurationChange}
        isLocked={durationLocked}
      />
    </Stack>
  );
}
