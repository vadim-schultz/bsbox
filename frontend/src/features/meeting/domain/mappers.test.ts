import { describe, expect, it } from "vitest";

import { mapVisitResponse } from "./mappers";
import type { VisitResponseDto } from "../types/dto";

const visitDto: VisitResponseDto = {
  meeting_id: "meeting-42",
  meeting_start: "2023-01-01T09:00:00Z",
  meeting_end: "2023-01-01T10:00:00Z",
};

describe("mapVisitResponse", () => {
  it("maps DTO into domain session", () => {
    const result = mapVisitResponse(visitDto);
    expect(result.meetingId).toBe("meeting-42");
    expect(result.meetingTimes.start).toBeInstanceOf(Date);
    expect(result.meetingTimes.end).toBeInstanceOf(Date);
  });
});
