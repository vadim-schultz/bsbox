/**
 * Countdown display component for meetings that haven't started yet.
 *
 * Shows a progress bar counting down to the meeting start time,
 * with meeting location info and time drift warnings.
 */

import { Box, Center, Flex, HStack, Progress, Stack, Text } from "@chakra-ui/react";
import { useCountdownTimer } from "../../hooks/useCountdownTimer";

type Props = {
  startTime: string;
  serverTime: string;
  cityName?: string | null;
  meetingRoomName?: string | null;
};

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatStartTime(startTimeIso: string): string {
  const date = new Date(startTimeIso);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

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
        <Box textAlign="center">
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
        </Box>

        <Stack gap={3}>
          <Progress.Root value={progress} size="lg" colorPalette="brand">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>

          <Flex justify="space-between" align="center">
            <Text fontSize="3xl" fontWeight="bold" color="brand.600">
              {isComplete ? "Starting..." : formatCountdown(remainingSeconds)}
            </Text>
            <Text fontSize="sm" color="muted">
              Starts at {formatStartTime(startTime)}
            </Text>
          </Flex>
        </Stack>

        {showDriftWarning && (
          <Box
            bg="yellow.50"
            color="yellow.900"
            _dark={{ bg: "yellow.900", color: "yellow.50" }}
            px={4}
            py={3}
            borderRadius="md"
            fontSize="sm"
          >
            <Text fontWeight="semibold">⚠️ Clock Drift Detected</Text>
            <Text mt={1}>
              Your device clock appears to be {Math.abs(Math.floor(driftMs / 1000))} seconds{" "}
              {driftMs > 0 ? "ahead" : "behind"} the server. The countdown uses server time for accuracy.
            </Text>
          </Box>
        )}

        <Box textAlign="center">
          <Text fontSize="sm" color="muted">
            The meeting will begin automatically when the countdown completes.
          </Text>
        </Box>
      </Stack>
    </Center>
  );
}

