import { Badge, Group, Progress, Stack, Text } from "@mantine/core";
import { MeetingAnalytics } from "../types/meeting";

type MeetingStatsProps = {
  analytics: MeetingAnalytics | null;
};

const MeetingStats = ({ analytics }: MeetingStatsProps) => {
  if (!analytics) {
    return <Text c="dimmed">Awaiting meeting data...</Text>;
  }

  return (
    <Stack gap="sm">
      <Text size="lg" fw={700}>
        Live meeting
      </Text>
      <Group gap="xs">
        <Badge color="blue" variant="light">
          {analytics.participantCount} online
        </Badge>
        <Badge color="grape" variant="light">
          {analytics.speakers} speaking
        </Badge>
      </Group>
      <Stack gap="xs">
        <Text size="sm" c="teal.2">
          Relevance
        </Text>
        <Progress value={analytics.relevanceScore * 100} color="teal" size="lg" radius="xl" />
        <Text size="xs" c="dimmed">
          {(analytics.relevanceScore * 100).toFixed(0)}% of connected participants marked this meeting as relevant.
        </Text>
      </Stack>
      <Stack gap="xs">
        <Text size="sm" c="orange.2">
          Speaking
        </Text>
        <Progress value={analytics.speakingScore * 100} color="orange" size="lg" radius="xl" />
        <Text size="xs" c="dimmed">
          {(analytics.speakingScore * 100).toFixed(0)}% of connected participants reported speaking recently.
        </Text>
      </Stack>
    </Stack>
  );
};

export default MeetingStats;

