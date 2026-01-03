/**
 * Countdown display component for meetings that haven't started yet.
 *
 * Shows a progress bar counting down to the meeting start time,
 * with meeting location info and time drift warnings.
 */

import { Center, HStack, Stack, Text } from "@chakra-ui/react";
import { useCountdownTimer } from "../../hooks/useCountdownTimer";
import { CountdownDisplay } from "./CountdownDisplay";
import { ClockDriftWarning } from "./ClockDriftWarning";

type Props = {
  startTime: string;
  serverTime: string;
  cityName?: string | null;
  meetingRoomName?: string | null;
};

export function MeetingCountdown({
  startTime,
  serverTime,
  cityName,
  meetingRoomName,
}: Props) {
  const { remainingSeconds, driftMs, isComplete } = useCountdownTimer(
    startTime,
    serverTime
  );

  // Calculate total countdown duration (from when component mounts)
  const startMs = new Date(startTime).getTime();
  const serverMs = new Date(serverTime).getTime();
  const totalSeconds = Math.max(0, Math.floor((startMs - serverMs) / 1000));

  // Progress value (0-100)
  const progress = totalSeconds > 0
    ? Math.min(100, ((totalSeconds - remainingSeconds) / totalSeconds) * 100)
    : 100;

  const showDriftWarning = Math.abs(driftMs) > 5000; // Show if drift > 5 seconds

  return (
    <Center py={10}>
      <Stack gap={6} width="full" maxW="600px">
        <Stack textAlign="center">
          <Text fontSize="2xl" fontWeight="semibold" color="textColor" mb={2}>
            Meeting Starting Soon
          </Text>
          {(cityName || meetingRoomName) && (
            <HStack justify="center" gap={2} color="muted" fontSize="sm">
              {cityName && <Text>{cityName}</Text>}
              {cityName && meetingRoomName && <Text>•</Text>}
              {meetingRoomName && <Text>{meetingRoomName}</Text>}
            </HStack>
          )}
        </Stack>

        <CountdownDisplay
          remainingSeconds={remainingSeconds}
          isComplete={isComplete}
          startTime={startTime}
          progress={progress}
        />

        {showDriftWarning && <ClockDriftWarning driftMs={driftMs} />}

        <Stack textAlign="center">
          <Text fontSize="sm" color="muted">
            The meeting will begin automatically when the countdown completes.
          </Text>
        </Stack>
      </Stack>
    </Center>
  );
}

