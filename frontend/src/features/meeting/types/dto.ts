export type StatusLiteral = "speaking" | "engaged" | "disengaged";

export type VisitResponseDto = {
  meeting_id: string;
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
  device_fingerprint: string;
  last_status?: StatusLiteral | null;
  engagement_samples: EngagementSampleDto[];
};

export type MSTeamsMeetingDto = {
  thread_id?: string | null;
  meeting_id?: string | null;
  invite_url?: string | null;
};

export type MeetingDto = {
  id: string;
  start_ts: string;
  end_ts: string;
  city_id?: string | null;
  city_name?: string | null;
  meeting_room_id?: string | null;
  meeting_room_name?: string | null;
  ms_teams?: MSTeamsMeetingDto | null;
};

export type MeetingWithParticipantsDto = MeetingDto & {
  participants: ParticipantDto[];
};

export type CityDto = {
  id: string;
  name: string;
};

export type MeetingRoomDto = {
  id: string;
  name: string;
  city_id: string;
};

/** Generic paginated response wrapper */
export type PaginatedDto<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
};
