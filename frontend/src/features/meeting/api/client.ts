import type {
  EngagementSummaryDto,
  MeetingWithParticipantsDto,
  MeetingDto,
  StatusLiteral,
  VisitResponseDto,
  MeetingDurationUpdateDto,
  CityDto,
  MeetingRoomDto,
  PaginatedDto,
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

export async function visit(params: {
  deviceFingerprint: string;
  cityId?: string;
  meetingRoomId?: string;
  msTeamsInput?: string;
}): Promise<VisitResponseDto> {
  return postJSON<VisitResponseDto>("/visit", {
    device_fingerprint: params.deviceFingerprint,
    city_id: params.cityId,
    meeting_room_id: params.meetingRoomId,
    ms_teams_input: params.msTeamsInput,
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

export async function updateMeetingDuration(params: {
  meetingId: string;
  data: MeetingDurationUpdateDto;
}): Promise<MeetingDto> {
  const res = await fetch(`${API_BASE}/meetings/${params.meetingId}/duration`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params.data),
  });
  return parse<MeetingDto>(res);
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

export async function getCities(): Promise<CityDto[]> {
  const response = await getJSON<PaginatedDto<CityDto>>("/cities");
  return response.items;
}

export async function getMeetingRooms(cityId: string): Promise<MeetingRoomDto[]> {
  const response = await getJSON<PaginatedDto<MeetingRoomDto>>(`/meeting-rooms?city_id=${cityId}`);
  return response.items;
}

export async function createCity(name: string): Promise<CityDto> {
  return postJSON<CityDto>("/cities", { name });
}

export async function createMeetingRoom(params: { name: string; cityId: string }): Promise<MeetingRoomDto> {
  return postJSON<MeetingRoomDto>("/meeting-rooms", { name: params.name, city_id: params.cityId });
}
