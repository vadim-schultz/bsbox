import { Flex, Progress, Stack, Text } from "@chakra-ui/react";

type Props = {
  remainingSeconds: number;
  isComplete: boolean;
  startTime: string;
  progress: number;
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

export function CountdownDisplay({ remainingSeconds, isComplete, startTime, progress }: Props) {
  return (
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
  );
}

