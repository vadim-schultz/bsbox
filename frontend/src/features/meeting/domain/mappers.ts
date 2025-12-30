import type {
  EngagementSummaryDto,
  MeetingWithParticipantsDto,
  MSTeamsMeetingDto,
  ParticipantDto,
  StatusLiteral,
  VisitResponseDto,
} from "../types/dto";
import type {
  EngagementPoint,
  EngagementSummary,
  Meeting,
  MSTeamsMeeting,
  Participant,
  VisitSession,
} from "../types/domain";

const toDate = (value: string) => new Date(value);

const mapParticipant = (participant: ParticipantDto): Participant => ({
  id: participant.id,
  meetingId: participant.meeting_id,
  deviceFingerprint: participant.device_fingerprint,
  lastStatus: participant.last_status ?? null,
  engagementSamples: participant.engagement_samples.map((sample) => ({
    bucket: sample.bucket,
    status: sample.status,
  })),
});

const mapMSTeamsMeeting = (
  msTeams: MSTeamsMeetingDto | null | undefined
): MSTeamsMeeting | null => {
  if (!msTeams) return null;
  return {
    threadId: msTeams.thread_id ?? null,
    meetingId: msTeams.meeting_id ?? null,
    inviteUrl: msTeams.invite_url ?? null,
  };
};

export const mapMeeting = (detail: MeetingWithParticipantsDto): Meeting => ({
  id: detail.id,
  start: toDate(detail.start_ts),
  end: toDate(detail.end_ts),
  cityId: detail.city_id ?? null,
  cityName: detail.city_name ?? null,
  meetingRoomId: detail.meeting_room_id ?? null,
  meetingRoomName: detail.meeting_room_name ?? null,
  msTeams: mapMSTeamsMeeting(detail.ms_teams),
  participants: detail.participants.map(mapParticipant),
});

export const mapVisitResponse = (response: VisitResponseDto): VisitSession => ({
  meetingId: response.meeting_id,
  meetingTimes: {
    start: toDate(response.meeting_start),
    end: toDate(response.meeting_end),
  },
});

export const deriveParticipantStatus = (
  meeting: Meeting,
  participantId?: string
): StatusLiteral => {
  if (!participantId) return "disengaged";
  const participant = meeting.participants.find((p) => p.id === participantId);
  return (participant?.lastStatus as StatusLiteral | undefined) ?? "disengaged";
};

export const mapEngagementSummary = (
  summary: EngagementSummaryDto
): EngagementSummary => {
  const toPoint = (bucket: string, value: number): EngagementPoint => ({
    bucket: toDate(bucket),
    value,
  });

  return {
    meetingId: summary.meeting_id,
    start: toDate(summary.start),
    end: toDate(summary.end),
    bucketMinutes: summary.bucket_minutes,
    windowMinutes: summary.window_minutes,
    overall: summary.overall.map((p) => toPoint(p.bucket, p.value)),
    participants: summary.participants.map((p) => ({
      participantId: p.participant_id,
      deviceFingerprint: p.device_fingerprint,
      series: p.series.map((s) => toPoint(s.bucket, s.value)),
    })),
  };
};
