import type { MeetingAnalytics, MeetingEventPayload } from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

const headers = {
  "Content-Type": "application/json",
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }
  return (await response.json()) as T;
}

export async function postEvent(payload: MeetingEventPayload): Promise<MeetingAnalytics> {
  const response = await fetch(`${API_BASE}/meetings/events`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      visitor_id: payload.visitorId,
      is_speaking: payload.isSpeaking,
      is_relevant: payload.isRelevant,
    }),
  });
  return handleResponse<MeetingAnalytics>(response);
}

export async function fetchAnalytics(): Promise<MeetingAnalytics> {
  const response = await fetch(`${API_BASE}/meetings/analytics`);
  return handleResponse<MeetingAnalytics>(response);
}

export async function fetchHistory(limit: number): Promise<MeetingAnalytics[]> {
  const response = await fetch(`${API_BASE}/meetings/analytics/history?limit=${limit}`);
  return handleResponse<MeetingAnalytics[]>(response);
}
