export interface ParticipantSnapshot {
  visitor_id: string;
  display_name?: string | null;
  signal_strength?: number | null;
  is_speaking: boolean;
  is_relevant: boolean;
}

export interface MeetingAnalytics {
  meeting_id: string;
  participant_count: number;
  speakers: number;
  relevance_score: number;
  speaking_score: number;
  timestamp: string;
  participants: ParticipantSnapshot[];
}

export interface MeetingEventPayload {
  visitorId: string;
  isSpeaking: boolean;
  isRelevant: boolean;
}
