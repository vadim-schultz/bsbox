import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { meetingService } from "../meetingService";

const createResponse = (data: unknown, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);

describe("meetingService", () => {
  const originalEnv = import.meta.env.VITE_API_BASE;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        throw new Error(`Unhandled fetch call: ${input.toString()}`);
      }),
    );
    (import.meta.env as typeof import.meta.env & { VITE_API_BASE?: string }).VITE_API_BASE = "http://localhost/api";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    (import.meta.env as typeof import.meta.env & { VITE_API_BASE?: string }).VITE_API_BASE = originalEnv;
  });

  it("fetches current analytics", async () => {
    const payload = { meetingId: "1" };
    (fetch as unknown as Mock).mockImplementationOnce(() => createResponse(payload));

    const result = await meetingService.fetchAnalytics();

    expect(fetch).toHaveBeenCalledWith("http://localhost/api/meetings/analytics");
    expect(result).toEqual(payload);
  });

  it("records meeting events", async () => {
    const payload = { visitorId: "abc", isSpeaking: true, isRelevant: false };
    const response = { meetingId: "1" };
    (fetch as unknown as Mock).mockImplementationOnce(() => createResponse(response));

    const result = await meetingService.recordEvent(payload);

    expect(fetch).toHaveBeenCalledWith("http://localhost/api/meetings/events", expect.any(Object));
    expect(result).toEqual(response);
  });

  it("throws on unsuccessful responses", async () => {
    (fetch as unknown as Mock).mockImplementationOnce(() => createResponse({}, false, 500));

    await expect(meetingService.fetchHistory(3)).rejects.toThrow("Failed to fetch analytics history");
  });
});


