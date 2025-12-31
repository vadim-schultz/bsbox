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
  const bucket = new Date(delta.bucket);
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
    bucket,
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
 * Build chart data from engagement summary.
 * The first parameter is kept for backwards compatibility but is no longer used.
 */
export const buildChartData = (
  _meeting: unknown,
  engagementSummary: EngagementSummary | null
): ChartPoint[] => {
  if (!engagementSummary) return [];

  const totalParticipants = engagementSummary.participants.length;

  return engagementSummary.overall
    .map((point) => toChartPoint(point.bucket, point.value, totalParticipants))
    .sort((a, b) => a.bucket.getTime() - b.bucket.getTime());
};
