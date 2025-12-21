import type { StatusLiteral } from "./dto";

export type MeetingTimes = {
  start: Date;
  end: Date;
};

export type VisitSession = {
  meetingId: string;
  participantId: string;
  expiresAt: Date;
  meetingTimes: MeetingTimes;
};

export type EngagementSample = {
  bucket: string;
  status: StatusLiteral;
};

export type EngagementPoint = {
  bucket: Date;
  value: number;
};

export type ParticipantEngagementSeries = {
  participantId: string;
  deviceFingerprint: string;
  series: EngagementPoint[];
};

export type EngagementSummary = {
  meetingId: string;
  start: Date;
  end: Date;
  bucketMinutes: number;
  windowMinutes: number;
  overall: EngagementPoint[];
  participants: ParticipantEngagementSeries[];
};

export type Participant = {
  id: string;
  meetingId: string;
  expiresAt: Date;
  lastStatus?: StatusLiteral | null;
  engagementSamples: EngagementSample[];
};

export type Meeting = {
  id: string;
  start: Date;
  end: Date;
  cityId?: string | null;
  cityName?: string | null;
  meetingRoomId?: string | null;
  meetingRoomName?: string | null;
  msTeamsThreadId?: string | null;
  msTeamsMeetingId?: string | null;
  msTeamsInviteUrl?: string | null;
  participants: Participant[];
};
