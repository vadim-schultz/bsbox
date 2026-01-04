import { toLocalDate } from "../utils/time";
import type {
  EngagementSummaryDto,
  VisitResponseDto,
} from "../types/dto";
import type {
  EngagementPoint,
  EngagementSummary,
  VisitSession,
} from "../types/domain";

export const mapVisitResponse = (response: VisitResponseDto): VisitSession => ({
  meetingId: response.meeting_id,
  meetingTimes: {
    start: toLocalDate(response.meeting_start),
    end: toLocalDate(response.meeting_end),
  },
});

export const mapEngagementSummary = (
  summary: EngagementSummaryDto
): EngagementSummary => {
  const toPoint = (bucket: string, value: number): EngagementPoint => ({
    bucket: toLocalDate(bucket),
    value,
  });

  return {
    meetingId: summary.meeting_id,
    start: toLocalDate(summary.start),
    end: toLocalDate(summary.end),
    bucketMinutes: summary.bucket_minutes,
    overall: summary.overall.map((p) => toPoint(p.bucket, p.value)),
    participants: summary.participants.map((p) => ({
      participantId: p.participant_id,
      deviceFingerprint: p.device_fingerprint,
      series: p.series.map((s) => toPoint(s.bucket, s.value)),
    })),
  };
};
