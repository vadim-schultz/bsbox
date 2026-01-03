import { Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { ParticipantBadge } from "./ParticipantBadge";
import { MeetingRangeControl } from "./MeetingRangeControl";
import type { MSTeamsMeeting } from "../../types/domain";

/**
 * Props for the MeetingInfo component.
 */
type Props = {
  /** Formatted label showing meeting time range */
  meetingLabel: string;
  /** Number of participants in the meeting */
  participantCount: number;
  /** Meeting start time */
  meetingStart?: Date;
  /** Meeting end time */
  meetingEnd?: Date;
  /** Current meeting duration in minutes */
  currentDurationMinutes?: number;
  /** Callback when duration is changed */
  onDurationChange?: (minutes: 30 | 60) => Promise<void> | void;
  /** Whether duration adjustment is locked */
  durationLocked?: boolean;
  /** Optional city name for the meeting */
  cityName?: string | null;
  /** Optional meeting room name */
  meetingRoomName?: string | null;
  /** Optional MS Teams meeting information */
  msTeams?: MSTeamsMeeting | null;
};

/**
 * Displays comprehensive meeting information including time, location,
 * participant count, and duration controls.
 *
 * @example
 * ```tsx
 * <MeetingInfo
 *   meetingLabel="10:00 AM - 11:00 AM"
 *   participantCount={5}
 *   meetingStart={startDate}
 *   meetingEnd={endDate}
 *   cityName="San Francisco"
 *   meetingRoomName="Conference Room A"
 * />
 * ```
 */
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

