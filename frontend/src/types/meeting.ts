export type Participant = {
  visitorId: string;
  displayName?: string;
  signalStrength?: number | null;
  isSpeaking: boolean;
  isRelevant: boolean;
};

export type MeetingAnalytics = {
  meetingId: string;
  participantCount: number;
  speakers: number;
  relevanceScore: number;
  speakingScore: number;
  timestamp: string;
  participants?: Participant[];
};

export type MeetingEventRequest = {
  visitorId: string;
  isSpeaking: boolean;
  isRelevant: boolean;
};

