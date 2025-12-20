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

const clampPercent = (value: number) => Math.min(Math.max(value, 0), 100);

const collectBucketsFromSummary = (
  engagementSummary: EngagementSummary | null,
  bucketMap: Map<string, StatusBucketData>
) => {
  if (!engagementSummary) return;
  engagementSummary.overall.forEach((point) => {
    const label = formatBucketLabel(point.bucket);
    bucketMap.set(label, {
      bucket: point.bucket,
      label,
      overall: point.value,
      statuses: [],
    });
  });
};

const collectBucketsFromMeeting = (
  meeting: Meeting | null,
  bucketMap: Map<string, StatusBucketData>
) => {
  if (!meeting) return;
  meeting.participants.forEach((participant) => {
    participant.engagementSamples.forEach((sample) => {
      const bucketDate = new Date(sample.bucket);
      const bucketKey = formatBucketLabel(bucketDate);
      const existing = bucketMap.get(bucketKey);
      if (existing) {
        existing.statuses.push(sample.status);
      } else {
        bucketMap.set(bucketKey, {
          bucket: bucketDate,
          label: bucketKey,
          statuses: [sample.status],
        });
      }
    });
  });
};

const toChartPoint = (
  data: StatusBucketData,
  totalParticipants: number
): ChartPoint => {
  const engagedCountFromSamples = data.statuses.filter(isEngagedStatus).length;
  const engagedPercentFromSamples =
    totalParticipants > 0
      ? (engagedCountFromSamples / totalParticipants) * 100
      : 0;

  const engagedPercent = data.overall ?? engagedPercentFromSamples;
  const clampedEngagedPercent = clampPercent(engagedPercent);
  const notEngagedPercent = Math.max(0, 100 - clampedEngagedPercent);
  const engagedCount = Math.round(
    (clampedEngagedPercent / 100) * totalParticipants
  );
  const notEngagedCount = Math.max(totalParticipants - engagedCount, 0);
  const overall = data.overall ?? clampedEngagedPercent;

  return {
    bucket: data.bucket,
    label: data.label,
    overall,
    engagedCount,
    notEngagedCount,
    engagedPercent: clampedEngagedPercent,
    notEngagedPercent,
    totalParticipants,
  };
};

const buildBucketMap = (
  meeting: Meeting | null,
  engagementSummary: EngagementSummary | null
) => {
  const bucketMap = new Map<string, StatusBucketData>();
  collectBucketsFromSummary(engagementSummary, bucketMap);
  collectBucketsFromMeeting(meeting, bucketMap);
  return bucketMap;
};

export const buildChartData = (
  meeting: Meeting | null,
  engagementSummary: EngagementSummary | null
): ChartPoint[] => {
  const totalParticipants =
    engagementSummary?.participants.length ??
    meeting?.participants.length ??
    0;

  const bucketMap = buildBucketMap(meeting, engagementSummary);
  if (bucketMap.size === 0) return [];

  return Array.from(bucketMap.values())
    .map((data) => toChartPoint(data, totalParticipants))
    .sort((a, b) => a.bucket.getTime() - b.bucket.getTime());
};
