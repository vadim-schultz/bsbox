import { Text } from "@chakra-ui/react";

import { LoadingState, Notice } from "../../../../../app/components/feedback";
import type { ChartPoint } from "../../../types/chart";
import type { MeetingTimes } from "../../../types/domain";
import { ChartCard } from "./ChartCard";
import { ChartEmptyState } from "./ChartEmptyState";
import { EngagementComposedChart } from "./EngagementComposedChart";

type Props = {
  data: ChartPoint[];
  meetingTimes?: MeetingTimes;
  bucketMinutes?: number;
  loading: boolean;
  error?: string | null;
};

export function EngagementChart({
  data,
  meetingTimes,
  bucketMinutes,
  loading,
  error,
}: Props) {
  if (loading) {
    return (
      <ChartCard title="Engagement">
        <LoadingState label="Loading engagement data..." />
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title="Engagement">
        <Notice status="error" message={error} title="Unable to load engagement" />
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Engagement (realtime)">
      <EngagementComposedChart data={data} meetingTimes={meetingTimes} />
      <Text color="muted" fontSize="xs" mt={3}>
        Real-time engagement tracking. Values update instantly when status changes.
      </Text>
    </ChartCard>
  );
}
