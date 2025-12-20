export type StatusLiteral = "speaking" | "engaged" | "not_engaged";

export type VisitResponseDto = {
  meeting_id: string;
  participant_id: string;
  participant_expires_at: string;
  meeting_start: string;
  meeting_end: string;
};

export type EngagementSampleDto = {
  bucket: string;
  status: StatusLiteral;
};

export type EngagementPointDto = {
  bucket: string;
  value: number;
};

export type ParticipantEngagementSeriesDto = {
  participant_id: string;
  device_fingerprint: string;
  series: EngagementPointDto[];
};

export type EngagementSummaryDto = {
  meeting_id: string;
  start: string;
  end: string;
  bucket_minutes: number;
  window_minutes: number;
  overall: EngagementPointDto[];
  participants: ParticipantEngagementSeriesDto[];
};

export type ParticipantDto = {
  id: string;
  meeting_id: string;
  expires_at: string;
  last_status?: StatusLiteral | null;
  engagement_samples: EngagementSampleDto[];
};

export type MeetingDto = {
  id: string;
  start_ts: string;
  end_ts: string;
};

export type MeetingDurationUpdateDto = {
  duration_minutes: 30 | 60;
};

export type MeetingWithParticipantsDto = MeetingDto & {
  participants: ParticipantDto[];
};
