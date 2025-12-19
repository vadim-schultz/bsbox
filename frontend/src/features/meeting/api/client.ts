import type {
  EngagementSummaryDto,
  MeetingWithParticipantsDto,
  StatusLiteral,
  VisitResponseDto,
} from "../types/dto";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  return response.json() as Promise<T>;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  return parse<T>(res);
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  return parse<T>(res);
}

export async function visit(
  deviceFingerprint: string
): Promise<VisitResponseDto> {
  return postJSON<VisitResponseDto>("/visit", {
    device_fingerprint: deviceFingerprint,
  });
}

export async function getMeeting(
  meetingId: string
): Promise<MeetingWithParticipantsDto> {
  return getJSON<MeetingWithParticipantsDto>(`/meetings/${meetingId}`);
}

export async function getEngagementSummary(
  meetingId: string
): Promise<EngagementSummaryDto> {
  return getJSON<EngagementSummaryDto>(`/meetings/${meetingId}/engagement`);
}

export async function updateStatus(params: {
  meetingId: string;
  participantId: string;
  status: StatusLiteral;
}): Promise<void> {
  await postJSON("/users/status", {
    meeting_id: params.meetingId,
    participant_id: params.participantId,
    status: params.status,
  });
}
