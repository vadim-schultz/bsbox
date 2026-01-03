/**
 * Meeting feature public API
 * 
 * This module exports the main components, hooks, types, and utilities
 * for the meeting feature. Use these exports when integrating the meeting
 * feature into other parts of the application.
 */

// Main containers
export { MeetingContainer } from "./containers/MeetingContainer";
export { SelectionContainer } from "./containers/SelectionContainer";

// Public hooks
export { useMeetingExperience } from "./hooks/useMeetingExperience";
export { useMeetingSocket } from "./hooks/useMeetingSocket";
export { useMeetingSession } from "./hooks/useMeetingSession";
export { useSelectionFlow } from "./hooks/useSelectionFlow";
export { useCountdownTimer } from "./hooks/useCountdownTimer";

// Public types
export type {
  VisitSession,
  MeetingTimes,
  MSTeamsMeeting,
  EngagementSummary,
  ParticipantSnapshot,
} from "./types/domain";

export type {
  StatusLiteral,
  CityDto,
  MeetingRoomDto,
  MeetingDto,
} from "./types/dto";

export type {
  ChartPoint,
  ChartDataPoint,
} from "./types/chart";

export type {
  WSMessage,
  WSRequest,
  WSResponse,
} from "./types/ws";

// Constants
export { MEETING_DURATION, COUNTDOWN, STATUS_MESSAGES } from "./config/constants";
