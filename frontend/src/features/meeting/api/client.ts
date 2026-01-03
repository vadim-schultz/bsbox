import type {
  MeetingDto,
  VisitResponseDto,
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
  cityId?: string;
  meetingRoomId?: string;
  msTeamsInput?: string;
  durationMinutes: 30 | 60;
}): Promise<VisitResponseDto> {
  return postJSON<VisitResponseDto>("/visit", {
    city_id: params.cityId,
    meeting_room_id: params.meetingRoomId,
    ms_teams_input: params.msTeamsInput,
    duration_minutes: params.durationMinutes,
  });
}

export async function getCities(): Promise<CityDto[]> {
  const response = await getJSON<PaginatedDto<CityDto>>("/cities");
  return response.items;
}

export async function getMeetingRooms(
  cityId: string
): Promise<MeetingRoomDto[]> {
  const response = await getJSON<PaginatedDto<MeetingRoomDto>>(
    `/meeting-rooms?city_id=${cityId}`
  );
  return response.items;
}

export async function createCity(name: string): Promise<CityDto> {
  return postJSON<CityDto>("/cities", { name });
}

export async function createMeetingRoom(params: {
  name: string;
  cityId: string;
}): Promise<MeetingRoomDto> {
  return postJSON<MeetingRoomDto>("/meeting-rooms", {
    name: params.name,
    city_id: params.cityId,
  });
}
