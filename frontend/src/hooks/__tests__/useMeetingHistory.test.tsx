import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import type { ReactNode } from "react";

import useMeetingHistory from "../useMeetingHistory";
import { meetingService } from "../../services/meetingService";

vi.mock("../../services/meetingService", () => ({
  meetingService: {
    fetchAnalytics: vi.fn(),
    recordEvent: vi.fn(),
    fetchHistory: vi.fn(),
    analyticsStreamUrl: "/stream",
  },
}));

const mockedService = vi.mocked(meetingService);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

describe("useMeetingHistory", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches meeting history with provided limit", async () => {
    const history = [
      {
        meetingId: "1",
        participantCount: 2,
        speakers: 1,
        relevanceScore: 0.5,
        speakingScore: 0.4,
        timestamp: new Date().toISOString(),
        participants: [],
      },
    ];

    mockedService.fetchHistory.mockResolvedValue(history);

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useMeetingHistory(5), { wrapper });

    await waitFor(() => expect(result.current.history).toEqual(history));
    expect(mockedService.fetchHistory).toHaveBeenCalledWith(5);

    queryClient.clear();
  });

  it("defaults to an empty list when no data is returned", async () => {
    mockedService.fetchHistory.mockResolvedValueOnce([]);

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useMeetingHistory(), { wrapper });

    await waitFor(() => expect(result.current.history).toEqual([]));
    expect(mockedService.fetchHistory).toHaveBeenCalledWith(10);

    queryClient.clear();
  });
});


