/**
 * Meeting Summary component displayed when a meeting ends.
 *
 * Shows meeting metadata, duration, participant count, and engagement statistics
 * with color-coded engagement level badges.
 */

import { Badge, Box, Card, Flex, Heading, HStack, Stack, Stat, Text } from "@chakra-ui/react";

type MeetingSummaryProps = {
  meetingId: string;
  cityName?: string | null;
  meetingRoomName?: string | null;
  msTeamsInviteUrl?: string | null;
  startTs: string;
  endTs: string;
  durationMinutes: number;
  maxParticipants: number;
  normalizedEngagement: number;
  engagementLevel: "high" | "healthy" | "passive" | "low";
};

const ENGAGEMENT_COLORS = {
  high: "blue",
  healthy: "green",
  passive: "yellow",
  low: "red",
} as const;

const ENGAGEMENT_LABELS = {
  high: "Highly Interactive",
  healthy: "Healthy Engagement",
  passive: "Passive",
  low: "Low Engagement",
} as const;

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MeetingSummary({
  cityName,
  meetingRoomName,
  msTeamsInviteUrl,
  startTs,
  endTs,
  durationMinutes,
  maxParticipants,
  normalizedEngagement,
  engagementLevel,
}: MeetingSummaryProps) {
  const engagementColor = ENGAGEMENT_COLORS[engagementLevel];
  const engagementLabel = ENGAGEMENT_LABELS[engagementLevel];
  const engagementPercent = Math.round(normalizedEngagement * 100);

  return (
    <Card.Root>
      <Card.Body>
        <Stack gap={6}>
          {/* Header */}
          <Flex align="center" gap={3}>
            <Text fontSize="4xl">✓</Text>
            <Heading size="xl">Meeting Complete</Heading>
          </Flex>

          {/* Location Info */}
          <Box>
            <Text fontSize="lg" fontWeight="semibold" mb={2}>
              Location
            </Text>
            <Stack gap={1}>
              {cityName && meetingRoomName ? (
                <Text color="fg.muted">
                  {cityName} • {meetingRoomName}
                </Text>
              ) : cityName ? (
                <Text color="fg.muted">{cityName}</Text>
              ) : meetingRoomName ? (
                <Text color="fg.muted">{meetingRoomName}</Text>
              ) : (
                <Text color="fg.muted">No location specified</Text>
              )}
              {msTeamsInviteUrl && (
                <Text color="fg.muted" fontSize="sm">
                  MS Teams Meeting
                </Text>
              )}
            </Stack>
          </Box>

          {/* Timing Info */}
          <Box>
            <Text fontSize="lg" fontWeight="semibold" mb={2}>
              Duration
            </Text>
            <Stack gap={1}>
              <Text color="fg.muted">
                {formatDateTime(startTs)} – {formatDateTime(endTs)}
              </Text>
              <Text color="fg.muted">{durationMinutes} minutes</Text>
            </Stack>
          </Box>

          {/* Engagement Metrics */}
          <Box>
            <Text fontSize="lg" fontWeight="semibold" mb={3}>
              Engagement
            </Text>
            <HStack gap={6} wrap="wrap">
              <Stat.Root>
                <Stat.Label>Participants</Stat.Label>
                <Stat.ValueText>
                  <Badge size="lg" colorPalette="gray">
                    {maxParticipants}
                  </Badge>
                </Stat.ValueText>
              </Stat.Root>

              <Stat.Root>
                <Stat.Label>Engagement Level</Stat.Label>
                <Stat.ValueText>
                  <Badge size="lg" colorPalette={engagementColor}>
                    {engagementPercent}% • {engagementLabel}
                  </Badge>
                </Stat.ValueText>
              </Stat.Root>
            </HStack>
          </Box>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}

