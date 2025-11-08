import { Card, Container, Grid, Group, Stack, Title } from "@mantine/core";
import ParticipantList from "../components/ParticipantList";
import MeetingStats from "../components/MeetingStats";
import MeetingTimeline from "../components/MeetingTimeline";
import useMeetingAnalytics from "../hooks/useMeetingAnalytics";
import useMeetingHistory from "../hooks/useMeetingHistory";

const MeetingDashboard = () => {
  const { analytics, toggleSpeaking, toggleRelevance } = useMeetingAnalytics();
  const { history } = useMeetingHistory(12);

  return (
    <Container size="xs" px="md" py="lg" className="min-h-screen bg-slate-950 text-white">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2} size="h3" fw={700}>
            Meeting Pulse
          </Title>
        </Group>

        <Card withBorder padding="md" radius="md" className="bg-slate-900">
          <MeetingStats analytics={analytics} />
        </Card>

        <Card withBorder padding="md" radius="md" className="bg-slate-900">
          <MeetingTimeline history={history} />
        </Card>

        <Card withBorder padding="md" radius="md" className="bg-slate-900">
          <ParticipantList
            analytics={analytics}
            onToggleSpeaking={toggleSpeaking}
            onToggleRelevance={toggleRelevance}
          />
        </Card>
      </Stack>
    </Container>
  );
};

export default MeetingDashboard;

