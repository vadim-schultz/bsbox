import { JSDOM } from "jsdom";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react-dom/test-utils";
import { createRoot, Root } from "react-dom/client";

import { useMeetingSocket } from "./useMeetingSocket";

type MeetingInfo = {
  id: string;
  start_ts: string;
  end_ts: string;
  city_id?: string | null;
  city_name?: string | null;
  meeting_room_id?: string | null;
  meeting_room_name?: string | null;
  ms_teams?: {
    thread_id?: string | null;
    meeting_id?: string | null;
    invite_url?: string | null;
  } | null;
};

type SummaryData = {
  meeting: MeetingInfo;
  duration_minutes: number;
  max_participants: number;
  normalized_engagement: number;
  engagement_level: "high" | "healthy" | "passive" | "low";
};

type HandlerMap = {
  snapshot: Array<(data: unknown) => void>;
  delta: Array<(data: unknown) => void>;
  joined: Array<(participantId: string, meetingId: string) => void>;
  meetingEnded: Array<(message?: string, summary?: SummaryData | null) => void>;
  meetingNotStarted: Array<(message?: string) => void>;
  meetingStarted: Array<(meetingId: string) => void>;
  countdown: Array<(data: any) => void>;
  error: Array<(message: string) => void>;
  stateChange: Array<(state: "connected" | "connecting" | "disconnected" | "ended" | "not_started") => void>;
};

let lastSocket: MockMeetingSocket | null = null;

class MockMeetingSocket {
  private handlers: HandlerMap = {
    snapshot: [],
    delta: [],
    joined: [],
    meetingEnded: [],
    meetingNotStarted: [],
    meetingStarted: [],
    countdown: [],
    error: [],
    stateChange: [],
  };

  private state: "connected" | "connecting" | "disconnected" | "ended" | "not_started" = "disconnected";

  constructor() {
    lastSocket = this;
  }

  getConnectionState() {
    return this.state;
  }

  async connect(): Promise<void> {
    this.setState("connected");
  }

  async join(): Promise<string> {
    return "participant-1";
  }

  sendStatus = vi.fn();
  disconnect = vi.fn();

  onSnapshot(handler: (data: unknown) => void) {
    this.handlers.snapshot.push(handler);
    return () => this.unregister("snapshot", handler);
  }

  onDelta(handler: (data: unknown) => void) {
    this.handlers.delta.push(handler);
    return () => this.unregister("delta", handler);
  }

  onMeetingEnded(handler: (message?: string, summary?: SummaryData | null) => void) {
    this.handlers.meetingEnded.push(handler);
    return () => this.unregister("meetingEnded", handler);
  }

  onMeetingNotStarted(handler: (message?: string) => void) {
    this.handlers.meetingNotStarted.push(handler);
    return () => this.unregister("meetingNotStarted", handler);
  }

  onCountdown(handler: (data: any) => void) {
    this.handlers.countdown.push(handler);
    return () => this.unregister("countdown", handler);
  }

  onMeetingStarted(handler: (meetingId: string) => void) {
    this.handlers.meetingStarted.push(handler);
    return () => this.unregister("meetingStarted", handler);
  }

  onError(handler: (message: string) => void) {
    this.handlers.error.push(handler);
    return () => this.unregister("error", handler);
  }

  onStateChange(handler: (state: "connected" | "connecting" | "disconnected" | "ended" | "not_started") => void) {
    this.handlers.stateChange.push(handler);
    return () => this.unregister("stateChange", handler);
  }

  emitEnded(message?: string, summary?: SummaryData | null) {
    this.handlers.meetingEnded.forEach((h) => h(message, summary));
  }

  private setState(state: "connected" | "connecting" | "disconnected" | "ended" | "not_started") {
    if (this.state !== state) {
      this.state = state;
      this.handlers.stateChange.forEach((h) => h(state));
    }
  }

  private unregister<T extends keyof HandlerMap>(key: T, handler: HandlerMap[T][number]) {
    const list = this.handlers[key];
    const idx = list.indexOf(handler as never);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
  }
}

vi.mock("../services/meetingSocket", () => ({
  MeetingSocket: MockMeetingSocket,
  __getLastSocket: () => lastSocket,
}));

describe("useMeetingSocket", () => {
  let root: Root | null = null;
  let container: HTMLElement | null = null;

  beforeEach(() => {
    const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>");
    globalThis.window = dom.window as unknown as typeof globalThis.window;
    globalThis.document = dom.window.document;
    globalThis.navigator = dom.window.navigator;
    container = document.getElementById("root");
  });

  afterEach(() => {
    if (root) {
      root.unmount();
      root = null;
    }
    container = null;
    lastSocket = null;
    vi.clearAllMocks();
  });

  it("extracts summary from meeting_ended message (atomic message format)", async () => {
    let hookState:
      | ReturnType<typeof useMeetingSocket>
      | null = null;

    function TestComponent() {
      hookState = useMeetingSocket("meeting-456", "fp-xyz");
      return null;
    }

    root = createRoot(container!);

    await act(async () => {
      root!.render(<TestComponent />);
    });

    const { __getLastSocket } = await import("../services/meetingSocket");
    const socket = __getLastSocket() as MockMeetingSocket | null;

    expect(socket).not.toBeNull();

    // Emit meeting_ended with embedded summary (new atomic format with nested meeting)
    await act(async () => {
      socket!.emitEnded("The meeting has ended.", {
        meeting: {
          id: "meeting-456",
          city_name: "London",
          meeting_room_name: "Tower",
          ms_teams: { invite_url: "https://teams.example.com" },
          start_ts: "2024-02-01T09:00:00Z",
          end_ts: "2024-02-01T10:30:00Z",
        },
        duration_minutes: 90,
        max_participants: 12,
        normalized_engagement: 0.65,
        engagement_level: "healthy",
      });
    });

    // Summary should be extracted from the meeting_ended message
    expect(hookState?.summaryData?.meetingId).toBe("meeting-456");
    expect(hookState?.summaryData?.cityName).toBe("London");
    expect(hookState?.summaryData?.meetingRoomName).toBe("Tower");
    expect(hookState?.summaryData?.durationMinutes).toBe(90);
    expect(hookState?.summaryData?.maxParticipants).toBe(12);
    expect(hookState?.summaryData?.normalizedEngagement).toBe(0.65);
    expect(hookState?.summaryData?.engagementLevel).toBe("healthy");
    expect(hookState?.meetingEnded).toBe(true);
    // No error should be set when summary is present
    expect(hookState?.error).toBeNull();
  });

  it("sets error message when meeting_ended has no summary (connecting to ended meeting)", async () => {
    let hookState:
      | ReturnType<typeof useMeetingSocket>
      | null = null;

    function TestComponent() {
      hookState = useMeetingSocket("meeting-789", "fp-def");
      return null;
    }

    root = createRoot(container!);

    await act(async () => {
      root!.render(<TestComponent />);
    });

    const { __getLastSocket } = await import("../services/meetingSocket");
    const socket = __getLastSocket() as MockMeetingSocket | null;

    expect(socket).not.toBeNull();

    // Emit meeting_ended without summary (e.g., connecting to already-ended meeting)
    await act(async () => {
      socket!.emitEnded("The meeting has already ended.", null);
    });

    // Should set error message when no summary is present
    expect(hookState?.meetingEnded).toBe(true);
    expect(hookState?.summaryData).toBeNull();
    expect(hookState?.error).toBe("The meeting has already ended.");
  });
});

