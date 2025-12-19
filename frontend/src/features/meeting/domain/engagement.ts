import type {
  EngagementPoint,
  EngagementSummary,
  Meeting,
} from "../types/domain";
import type { ChartPoint } from "../types/chart";
import type { DeltaMessageData } from "../types/ws";
import type { StatusLiteral } from "../types/dto";

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

/**
 * Helper to check if a status is considered "engaged".
 */
const isEngagedStatus = (status: StatusLiteral): boolean =>
  status === "speaking" || status === "engaged";

/**
 * Helper type for building chart data from status samples.
 */
type StatusBucketData = {
  bucket: Date;
  label: string;
  overall?: number | null;
  statuses: StatusLiteral[];
};

/**
 * Build chart data from raw meeting data with engagement samples.
 * Counts engaged (speaking/engaged) vs not_engaged per bucket.
 * Participants without a sample for a bucket are counted as "not engaged".
 */
export const buildChartData = (
  meeting: Meeting | null,
  engagementSummary: EngagementSummary | null
): ChartPoint[] => {
  if (!meeting) return [];

  const bucketMap = new Map<string, StatusBucketData>();
  const totalParticipants = meeting.participants.length;

  // Collect statuses per bucket from all participants
  meeting.participants.forEach((participant) => {
    participant.engagementSamples.forEach((sample) => {
      const bucketKey = sample.bucket;
      const existing = bucketMap.get(bucketKey);
      if (existing) {
        existing.statuses.push(sample.status);
      } else {
        const bucketDate = new Date(sample.bucket);
        bucketMap.set(bucketKey, {
          bucket: bucketDate,
          label: formatBucketLabel(bucketDate),
          statuses: [sample.status],
        });
      }
    });
  });

  // Add overall engagement values from the summary if available
  // Match by bucket label (HH:MM) since timestamps may differ
  if (engagementSummary) {
    engagementSummary.overall.forEach((point) => {
      const pointLabel = formatBucketLabel(point.bucket);
      for (const data of bucketMap.values()) {
        if (data.label === pointLabel) {
          data.overall = point.value;
          break;
        }
      }
    });
  }

  // Transform to ChartPoints
  // Stacked area should sum to 100% of total participants:
  // - engagedCount = participants with speaking/engaged status
  // - notEngagedCount = all other participants (including those without samples)
  return Array.from(bucketMap.values())
    .map((data): ChartPoint => {
      const engagedCount = data.statuses.filter(isEngagedStatus).length;
      // All participants not engaged = total - engaged
      const notEngagedCount = totalParticipants - engagedCount;
      const engagedPercent =
        totalParticipants > 0 ? (engagedCount / totalParticipants) * 100 : 0;
      const notEngagedPercent =
        totalParticipants > 0 ? (notEngagedCount / totalParticipants) * 100 : 0;

      // Use server-provided overall if available, otherwise use engagedPercent
      const overall = data.overall ?? engagedPercent;

      return {
        bucket: data.bucket,
        label: data.label,
        overall,
        engagedCount,
        notEngagedCount,
        engagedPercent,
        notEngagedPercent,
        totalParticipants,
      };
    })
    .sort((a, b) => a.bucket.getTime() - b.bucket.getTime());
};
