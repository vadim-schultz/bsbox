import { Button, Group, Stack, Text } from "@mantine/core";
import { MeetingAnalytics } from "../types/meeting";

type ParticipantListProps = {
  analytics: MeetingAnalytics | null;
  onToggleSpeaking: (visitorId: string) => void;
  onToggleRelevance: (visitorId: string) => void;
};

const ParticipantList = ({
  analytics,
  onToggleRelevance,
  onToggleSpeaking,
}: ParticipantListProps) => {
  const participants = analytics?.participants ?? [];

  return (
    <Stack gap="md">
      {participants.length === 0 && <Text c="dimmed">No participants connected.</Text>}
      {participants.map((participant) => (
        <Stack key={participant.visitorId} gap="xs" className="rounded-lg border border-slate-800 p-3">
          <Stack gap={0}>
            <Text fw={600} size="sm">
              {participant.displayName ?? participant.visitorId.slice(-4).padStart(4, "*")}
            </Text>
            <Text size="xs" c="dimmed">
              Signal: {participant.signalStrength ?? "n/a"}
            </Text>
          </Stack>
          <Group gap="xs" grow>
            <Button
              size="sm"
              variant={participant.isSpeaking ? "filled" : "light"}
              color="orange"
              fullWidth
              radius="md"
              aria-pressed={participant.isSpeaking}
              onClick={() => onToggleSpeaking(participant.visitorId)}
            >
              Speaking
            </Button>
            <Button
              size="sm"
              variant={participant.isRelevant ? "filled" : "light"}
              color="teal"
              fullWidth
              radius="md"
              aria-pressed={participant.isRelevant}
              onClick={() => onToggleRelevance(participant.visitorId)}
            >
              Relevant
            </Button>
          </Group>
        </Stack>
      ))}
    </Stack>
  );
};

export default ParticipantList;

