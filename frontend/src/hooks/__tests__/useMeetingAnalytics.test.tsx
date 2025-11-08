import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import type { ReactNode } from "react";

import useMeetingAnalytics from "../useMeetingAnalytics";
import { meetingService } from "../../services/meetingService";

vi.mock("../../services/meetingService", () => ({
  meetingService: {
    fetchAnalytics: vi.fn(),
    recordEvent: vi.fn(),
    fetchHistory: vi.fn(),
    analyticsStreamUrl: "/stream",
  },
}));

class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  close = vi.fn();

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }
}

const mockedService = vi.mocked(meetingService);

describe("useMeetingAnalytics", () => {
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

  beforeEach(() => {
    (globalThis as { EventSource?: typeof EventSource }).EventSource =
      MockEventSource as unknown as typeof EventSource;
    MockEventSource.instances = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("loads analytics and updates from the stream", async () => {
    const initialAnalytics = {
      meetingId: "1",
      participantCount: 1,
      speakers: 0,
      relevanceScore: 0.5,
      speakingScore: 0.3,
      timestamp: new Date().toISOString(),
      participants: [
        {
          visitorId: "user-1",
          displayName: null,
          signalStrength: -40,
          isSpeaking: false,
          isRelevant: false,
        },
      ],
    };
    const streamedAnalytics = { ...initialAnalytics, participantCount: 2 };

    mockedService.fetchAnalytics.mockResolvedValue(initialAnalytics);

    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useMeetingAnalytics(), { wrapper });

    await waitFor(() => expect(result.current.analytics).toEqual(initialAnalytics));
    await waitFor(() => expect(MockEventSource.instances.length).toBeGreaterThan(0));
    expect(MockEventSource.instances[0].url).toContain("/stream");

    act(() => {
      MockEventSource.instances[0].onmessage?.({ data: JSON.stringify(streamedAnalytics) } as MessageEvent<string>);
    });

    await waitFor(() => expect(result.current.analytics).toEqual(streamedAnalytics));
    queryClient.clear();
  });

  it("toggles speaking and relevance state", async () => {
    const analytics = {
      meetingId: "1",
      participantCount: 1,
      speakers: 0,
      relevanceScore: 0.5,
      speakingScore: 0.3,
      timestamp: new Date().toISOString(),
      participants: [
        {
          visitorId: "user-1",
          displayName: null,
          signalStrength: -40,
          isSpeaking: false,
          isRelevant: false,
        },
      ],
    };
    const updatedAnalytics = {
      ...analytics,
      participants: [
        {
          ...analytics.participants[0],
          isSpeaking: true,
          isRelevant: true,
        },
      ],
    };

    mockedService.fetchAnalytics.mockResolvedValue(analytics);
    mockedService.recordEvent.mockResolvedValue(updatedAnalytics);

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useMeetingAnalytics(), { wrapper });

    await waitFor(() => expect(result.current.analytics).toEqual(analytics));
    await waitFor(() => expect(MockEventSource.instances.length).toBeGreaterThan(0));

    await act(async () => {
      result.current.toggleSpeaking("user-1");
    });
    await waitFor(() =>
      expect(mockedService.recordEvent).toHaveBeenCalledWith({
        visitorId: "user-1",
        isSpeaking: true,
        isRelevant: false,
      }),
    );

    await act(async () => {
      result.current.toggleRelevance("user-1");
    });
    await waitFor(() =>
      expect(mockedService.recordEvent).toHaveBeenCalledWith({
        visitorId: "user-1",
        isSpeaking: true,
        isRelevant: true,
      }),
    );
    queryClient.clear();
  });
});


