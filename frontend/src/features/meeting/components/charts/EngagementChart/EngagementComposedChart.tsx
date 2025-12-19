import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartConfig, chartPalette } from "../../../config/chart";
import type { ChartPoint } from "../../../types/chart";

type Props = {
  data: ChartPoint[];
};

export function EngagementComposedChart({ data }: Props) {
  // Calculate max participants for right Y-axis domain
  const maxParticipants = useMemo(() => {
    if (data.length === 0) return 10;
    const max = Math.max(...data.map((d) => d.totalParticipants));
    return Math.max(max, 1);
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={chartConfig.height}>
      <ComposedChart data={data} margin={chartConfig.margin}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis
          yAxisId="left"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          orientation="left"
        />
        <YAxis
          yAxisId="right"
          domain={[0, maxParticipants]}
          orientation="right"
          allowDecimals={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === "Engaged" || name === "Not Engaged") {
              // Show count for stacked areas
              const count =
                name === "Engaged"
                  ? data.find((d) => d.engagedPercent === value)?.engagedCount
                  : data.find((d) => d.notEngagedPercent === value)
                      ?.notEngagedCount;
              return [`${value.toFixed(1)}% (${count ?? 0})`, name];
            }
            return [`${value.toFixed(1)}%`, name];
          }}
          labelFormatter={(label) => `Time: ${label}`}
        />
        <Legend />
        {/* Stacked area: Not Engaged at bottom (gray), Engaged on top (green) */}
        <Area
          type="monotone"
          dataKey="notEngagedPercent"
          yAxisId="left"
          stackId="engagement"
          stroke={chartConfig.area.notEngagedColor}
          fill={chartConfig.area.notEngagedColor}
          fillOpacity={chartConfig.area.notEngagedOpacity}
          strokeWidth={0}
          isAnimationActive={false}
          name="Not Engaged"
        />
        <Area
          type="monotone"
          dataKey="engagedPercent"
          yAxisId="left"
          stackId="engagement"
          stroke={chartConfig.area.engagedColor}
          fill={chartConfig.area.engagedColor}
          fillOpacity={chartConfig.area.engagedOpacity}
          strokeWidth={0}
          isAnimationActive={false}
          name="Engaged"
        />
        {/* Overall engagement line */}
        <Line
          type="monotone"
          dataKey="overall"
          yAxisId="left"
          stroke={chartPalette[0]}
          strokeWidth={chartConfig.strokeWidth.overall}
          dot={false}
          isAnimationActive={false}
          name="Overall"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
