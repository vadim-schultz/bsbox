import { useMemo, useState, useEffect } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartConfig, chartPalette } from "../../../config/chart";
import type { ChartPoint } from "../../../types/chart";
import type { MeetingTimes } from "../../../types/domain";

type Props = {
  data: ChartPoint[];
  meetingTimes?: MeetingTimes;
};

export function EngagementComposedChart({ data, meetingTimes }: Props) {
  // Track current time for reference line
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    // Update current time every 10 seconds
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Calculate max participants for right Y-axis domain
  const maxParticipants = useMemo(() => {
    if (data.length === 0) return 10;
    const max = Math.max(...data.map((d) => d.totalParticipants));
    return Math.max(max, 1);
  }, [data]);

  // Calculate x-axis domain based on meeting times (fixed range)
  const xAxisDomain = useMemo<[number, number] | undefined>(() => {
    if (meetingTimes?.start && meetingTimes?.end) {
      return [meetingTimes.start.getTime(), meetingTimes.end.getTime()];
    }
    return undefined;
  }, [meetingTimes]);

  // Check if current time is within meeting bounds
  const isCurrentTimeInRange = useMemo(() => {
    if (!meetingTimes?.start || !meetingTimes?.end) return false;
    return (
      currentTime >= meetingTimes.start.getTime() &&
      currentTime <= meetingTimes.end.getTime()
    );
  }, [currentTime, meetingTimes]);

  // Format timestamp to HH:MM for x-axis ticks and tooltips
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <ResponsiveContainer width="100%" height={chartConfig.height}>
      <ComposedChart data={data} margin={chartConfig.margin}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="bucket"
          type="number"
          scale="time"
          domain={xAxisDomain || ["dataMin", "dataMax"]}
          tickFormatter={formatTime}
          minTickGap={40}
        />
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
          labelFormatter={(label) => {
            // Label is the bucket timestamp when using numeric x-axis
            const timestamp = typeof label === "number" ? label : Number(label);
            return `Time: ${formatTime(timestamp)}`;
          }}
        />
        <Legend />
        {/* Current time indicator (only if within meeting bounds) */}
        {isCurrentTimeInRange && (
          <ReferenceLine
            x={currentTime}
            stroke="#FF6B6B"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: "Now",
              position: "top",
              fill: "#FF6B6B",
              fontSize: 12,
            }}
            yAxisId="left"
          />
        )}
        {/* Stacked area: Not Engaged at bottom (gray), Engaged on top (green) */}
        <Area
          type="linear"
          dataKey="notEngagedPercent"
          yAxisId="left"
          stackId="engagement"
          stroke={chartConfig.area.notEngagedColor}
          fill={chartConfig.area.notEngagedColor}
          fillOpacity={chartConfig.area.notEngagedOpacity}
          strokeWidth={0}
          isAnimationActive={false}
          connectNulls={true}
          name="Not Engaged"
        />
        <Area
          type="linear"
          dataKey="engagedPercent"
          yAxisId="left"
          stackId="engagement"
          stroke={chartConfig.area.engagedColor}
          fill={chartConfig.area.engagedColor}
          fillOpacity={chartConfig.area.engagedOpacity}
          strokeWidth={0}
          isAnimationActive={false}
          connectNulls={true}
          name="Engaged"
        />
        {/* Overall engagement line */}
        <Line
          type="linear"
          dataKey="overall"
          yAxisId="left"
          stroke={chartPalette[0]}
          strokeWidth={chartConfig.strokeWidth.overall}
          dot={false}
          isAnimationActive={false}
          connectNulls={true}
          name="Overall"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
