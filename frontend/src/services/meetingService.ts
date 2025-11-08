import { MeetingAnalytics, MeetingEventRequest } from "../types/meeting";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://raspberrypi.local/api";

const withBase = (path: string) => `${API_BASE}${path}`;

const fetchAnalytics = async (): Promise<MeetingAnalytics> => {
  const response = await fetch(withBase("/meetings/analytics"));
  if (!response.ok) {
    throw new Error("Failed to fetch analytics");
  }
  return response.json();
};

const recordEvent = async (payload: MeetingEventRequest): Promise<MeetingAnalytics> => {
  const response = await fetch(withBase("/meetings/events"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to record event");
  }
  return response.json();
};

const fetchHistory = async (limit = 10): Promise<MeetingAnalytics[]> => {
  const response = await fetch(withBase(`/meetings/analytics/history?limit=${limit}`));
  if (!response.ok) {
    throw new Error("Failed to fetch analytics history");
  }
  return response.json();
};

const analyticsStreamUrl = withBase("/meetings/analytics/stream");

export const meetingService = {
  fetchAnalytics,
  recordEvent,
  fetchHistory,
  analyticsStreamUrl,
};

