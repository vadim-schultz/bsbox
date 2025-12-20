import { Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { ParticipantBadge } from "./ParticipantBadge";
import { MeetingRangeControl } from "./MeetingRangeControl";

type Props = {
  meetingLabel: string;
  participantCount: number;
  meetingStart?: Date;
  meetingEnd?: Date;
  currentDurationMinutes?: number;
  onDurationChange?: (minutes: 30 | 60) => Promise<void> | void;
  durationLocked?: boolean;
};

export function MeetingInfo({
  meetingLabel,
  participantCount,
  meetingStart,
  meetingEnd,
  currentDurationMinutes = 60,
  onDurationChange,
  durationLocked,
}: Props) {
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

