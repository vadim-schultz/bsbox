import { toLocalDate } from "../utils/time";
import type {
  EngagementPoint,
  EngagementSummary,
} from "../types/domain";
import type { ChartPoint } from "../types/chart";
import type { DeltaMessageData } from "../types/ws";

/**
 * Format a Date to HH:MM label for chart display.
 */
export const formatBucketLabel = (date: Date): string =>
  `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

/**
 * Upsert a point into a series, maintaining sorted order by bucket time.
 */
export const upsertPoint = (
  series: EngagementPoint[],
  bucket: Date,
  value: number
): EngagementPoint[] => {
  const idx = series.findIndex(
    (point) => point.bucket.getTime() === bucket.getTime()
  );
  if (idx >= 0) {
    const updated = [...series];
    updated[idx] = { bucket, value };
    return updated;
  }
  return [...series, { bucket, value }].sort(
    (a, b) => a.bucket.getTime() - b.bucket.getTime()
  );
};

/**
 * Apply a delta message to an existing engagement summary.
 * Updates existing participant series and adds new participants if needed.
 */
export const applyDelta = (
  summary: EngagementSummary,
  delta: DeltaMessageData
): EngagementSummary => {
  const bucket = toLocalDate(delta.bucket);
  const existingIds = new Set(summary.participants.map((p) => p.participantId));
  const participants = summary.participants.map((p) => {
    const value = delta.participants[p.participantId];
    if (value === undefined) return p;
    return { ...p, series: upsertPoint(p.series, bucket, value) };
  });

  // Add any participants that may not yet be in the snapshot (e.g., late joiners)
  Object.entries(delta.participants).forEach(([participantId, value]) => {
    if (!existingIds.has(participantId)) {
      participants.push({
        participantId,
        deviceFingerprint: "",
        series: [{ bucket, value }],
      });
    }
  });

  const overall = upsertPoint(summary.overall, bucket, delta.overall);

  return {
    ...summary,
    participants,
    overall,
  };
};

const clampPercent = (value: number) => Math.min(Math.max(value, 0), 100);

const toChartPoint = (
  bucket: Date,
  overall: number,
  totalParticipants: number
): ChartPoint => {
  const clampedEngagedPercent = clampPercent(overall);
  const notEngagedPercent = Math.max(0, 100 - clampedEngagedPercent);
  const engagedCount = Math.round(
    (clampedEngagedPercent / 100) * totalParticipants
  );
  const notEngagedCount = Math.max(totalParticipants - engagedCount, 0);

  return {
    bucket: bucket.getTime(), // Use timestamp for x-axis
    label: formatBucketLabel(bucket),
    overall: clampedEngagedPercent,
    engagedCount,
    notEngagedCount,
    engagedPercent: clampedEngagedPercent,
    notEngagedPercent,
    totalParticipants,
  };
};

/**
 * Build chart data from engagement summary, only plotting data up to the current moment.
 * 
 * @param meetingStart - Meeting start time (for fixed x-axis bounds)
 * @param meetingEnd - Meeting end time (for fixed x-axis bounds)
 * @param engagementSummary - Engagement data from server
 * @returns Chart points up to current time (future time remains unpopulated)
 */
export const buildChartData = (
  meetingStart: Date | null | undefined,
  meetingEnd: Date | null | undefined,
  engagementSummary: EngagementSummary | null
): ChartPoint[] => {
  // Use summary times or fallback to provided times
  const start = meetingStart || engagementSummary?.start;
  const end = meetingEnd || engagementSummary?.end;
  
  if (!start || !end) return [];

  const totalParticipants = engagementSummary?.participants.length ?? 0;
  const bucketMinutes = engagementSummary?.bucketMinutes ?? 1;

  // Create a map of existing data points, normalizing to minute boundaries
  const dataMap = new Map<number, number>();
  if (engagementSummary) {
    engagementSummary.overall.forEach((point) => {
      // Normalize to minute boundary (remove seconds/ms)
      const normalized = new Date(point.bucket);
      normalized.setSeconds(0, 0);
      dataMap.set(normalized.getTime(), point.value);
    });
  }

  // Calculate cutoff time: min of (latest data point, current time)
  // This ensures we only plot up to "now" and don't project into the future
  const now = Date.now();
  const latestDataTime = engagementSummary?.overall.length
    ? Math.max(...engagementSummary.overall.map(p => p.bucket.getTime()))
    : now;
  const cutoffTime = Math.min(latestDataTime, now);
  
  const points: ChartPoint[] = [];
  const stepMs = bucketMinutes * 60_000;
  
  // Normalize start to minute boundary
  const startNormalized = new Date(start);
  startNormalized.setSeconds(0, 0);
  const endNormalized = new Date(end);
  endNormalized.setSeconds(0, 0);
  
  // Forward-fill: carry last known value to future buckets, but only up to cutoff
  let lastValue = 0;
  for (let ts = startNormalized.getTime(); ts <= Math.min(cutoffTime, endNormalized.getTime()); ts += stepMs) {
    const bucket = new Date(ts);
    // If we have a value for this bucket, use it and update lastValue
    // Otherwise, use the last known value (forward-fill)
    const value = dataMap.get(ts);
    if (value !== undefined) {
      lastValue = value;
    }
    points.push(toChartPoint(bucket, lastValue, totalParticipants));
  }

  return points;
};

/**
 * Build a zeroed chart for a given time range when no summary is available yet.
 */
export const buildBaselineChart = (
  start: Date,
  end: Date,
  bucketMinutes = 1
): ChartPoint[] => {
  const points: ChartPoint[] = [];
  const stepMs = bucketMinutes * 60_000;
  for (let ts = start.getTime(); ts <= end.getTime(); ts += stepMs) {
    const bucket = new Date(ts);
    points.push({
      bucket: ts, // Use timestamp for x-axis
      label: formatBucketLabel(bucket),
      overall: 0,
      engagedCount: 0,
      notEngagedCount: 0,
      engagedPercent: 0,
      notEngagedPercent: 100,
      totalParticipants: 0,
    });
  }
  return points;
};
