import { Text } from "@chakra-ui/react";

import { LoadingState, ErrorNotice } from "../../feedback";
import type { ChartPoint } from "../../../types/chart";
import { ChartCard } from "./ChartCard";
import { ChartEmptyState } from "./ChartEmptyState";
import { EngagementComposedChart } from "./EngagementComposedChart";

type Props = {
  data: ChartPoint[];
  windowMinutes?: number;
  bucketMinutes?: number;
  loading: boolean;
  error?: string | null;
};

export function EngagementChart({
  data,
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

  if (data.length === 0) {
    return (
      <ChartCard title="Engagement">
        <ChartEmptyState />
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Engagement (realtime)">
      <EngagementComposedChart data={data} />
      {windowMinutes !== undefined && bucketMinutes !== undefined && (
        <Text color="muted" fontSize="xs" mt={3}>
          Values are smoothed using the sliding window from the server (window:{" "}
          {windowMinutes}m, bucket: {bucketMinutes}m).
        </Text>
      )}
    </ChartCard>
  );
}
