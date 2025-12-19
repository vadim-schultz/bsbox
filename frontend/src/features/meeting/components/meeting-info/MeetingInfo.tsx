import { Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { ParticipantBadge } from "./ParticipantBadge";

type Props = {
  meetingLabel: string;
  participantCount: number;
};

export function MeetingInfo({ meetingLabel, participantCount }: Props) {
  return (
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
  );
}

