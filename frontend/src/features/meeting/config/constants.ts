/**
 * Feature-level constants for the meeting feature.
 * Centralized location for magic numbers and strings.
 */

// Meeting duration constants (in minutes)
export const MEETING_DURATION = {
  SHORT: 30,
  STANDARD: 60,
  DEFAULT: 60,
} as const;

// Countdown constants
export const COUNTDOWN = {
  CLOCK_DRIFT_THRESHOLD_MS: 5000, // Show warning if drift > 5 seconds
  UPDATE_INTERVAL_MS: 10000, // Update current time every 10 seconds
} as const;

// Time formatting constants
export const TIME_FORMAT = {
  PLACEHOLDER: "--:--",
  HOUR_MINUTE: "HH:mm",
} as const;

// Status messages
export const STATUS_MESSAGES = {
  COUNTDOWN_STARTING: "Starting...",
  COUNTDOWN_TITLE: "Meeting Starting Soon",
  COUNTDOWN_INFO: "The meeting will begin automatically when the countdown completes.",
  MEETING_ENDED: "This meeting has ended. Status updates are no longer possible.",
  MEETING_NOT_STARTED: "This meeting has not started yet. Status updates are not yet possible.",
  CONNECTING: "Connecting to meeting...",
  SELECT_CITY_OR_TEAMS: "Please select a city or enter a Teams meeting link to continue.",
} as const;

// Meeting labels
export const MEETING_LABELS = {
  CURRENT_MEETING: "Current meeting",
  ADJUST_DURATION: "Adjust duration (one-time)",
  PARTICIPANT_LABEL: "participant",
} as const;

// Status card content
export const STATUS_CARDS = {
  SPEAKING: {
    TITLE: "I am speaking",
    DESCRIPTION: "Let others know you are taking the floor.",
  },
  ENGAGED: {
    TITLE: "This is interesting",
    DESCRIPTION: "Signal engagement with the current discussion.",
  },
} as const;

// Chart configuration
export const CHART_CONFIG = {
  HEIGHT: 320,
  MARGIN: { top: 10, right: 30, left: 0, bottom: 0 },
} as const;

