export type MeetingTimes = {
  start: Date;
  end: Date;
};

export type VisitSession = {
  meetingId: string;
  meetingTimes: MeetingTimes;
  /** City name from selection (display only) */
  cityName?: string | null;
  /** Meeting room name from selection (display only) */
  meetingRoomName?: string | null;
  /** MS Teams input from selection (display only) */
  msTeamsInput?: string | null;
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
  overall: EngagementPoint[];
  participants: ParticipantEngagementSeries[];
};

export type MSTeamsMeeting = {
  threadId?: string | null;
  meetingId?: string | null;
  inviteUrl?: string | null;
};
