import { describe, expect, it } from "vitest";

import {
  deriveParticipantStatus,
  mapMeeting,
  mapVisitResponse,
} from "./mappers";
import type {
  MeetingWithParticipantsDto,
  VisitResponseDto,
} from "../types/dto";

// Visit response no longer includes participant_id (participant creation via WebSocket)
const visitDto: VisitResponseDto = {
  meeting_id: "meeting-42",
  meeting_start: "2023-01-01T09:00:00Z",
  meeting_end: "2023-01-01T10:00:00Z",
};

const meetingDto: MeetingWithParticipantsDto = {
  id: "meeting-42",
  start_ts: "2023-01-01T09:00:00Z",
  end_ts: "2023-01-01T10:00:00Z",
  participants: [
    {
      id: "abc",
      meeting_id: "meeting-42",
      device_fingerprint: "fp-123",
      last_status: "speaking",
      engagement_samples: [{ bucket: "09:00", status: "engaged" }],
    },
  ],
};

describe("mapVisitResponse", () => {
  it("maps DTO into domain session", () => {
    const result = mapVisitResponse(visitDto);
    expect(result.meetingId).toBe("meeting-42");
    // participantId no longer in VisitSession - comes from WebSocket join
    expect(result.meetingTimes.start).toBeInstanceOf(Date);
    expect(result.meetingTimes.end).toBeInstanceOf(Date);
  });
});

describe("mapMeeting", () => {
  it("maps meeting DTO into domain model", () => {
    const result = mapMeeting(meetingDto);
    expect(result.id).toBe("meeting-42");
    expect(result.participants[0].lastStatus).toBe("speaking");
    expect(result.participants[0].deviceFingerprint).toBe("fp-123");
  });
});

describe("deriveParticipantStatus", () => {
  it("returns status for known participant", () => {
    const meeting = mapMeeting(meetingDto);
    expect(deriveParticipantStatus(meeting, "abc")).toBe("speaking");
  });

  it("defaults to disengaged when participant missing", () => {
    const meeting = mapMeeting(meetingDto);
    expect(deriveParticipantStatus(meeting, "unknown")).toBe("disengaged");
  });
});
