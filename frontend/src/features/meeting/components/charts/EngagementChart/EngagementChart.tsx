import { Text } from "@chakra-ui/react";

import { LoadingState, ErrorNotice } from "../../feedback";
import type { ChartPoint } from "../../../types/chart";
import type { MeetingTimes } from "../../../types/domain";
import { ChartCard } from "./ChartCard";
import { ChartEmptyState } from "./ChartEmptyState";
import { EngagementComposedChart } from "./EngagementComposedChart";

type Props = {
  data: ChartPoint[];
  meetingTimes?: MeetingTimes;
  windowMinutes?: number;
  bucketMinutes?: number;
  loading: boolean;
  error?: string | null;
};

export function EngagementChart({
  data,
  meetingTimes,
  windowMinutes,
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
        <ErrorNotice message={error} title="Unable to load engagement" />
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
