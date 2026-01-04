import { JSDOM } from "jsdom";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react-dom/test-utils";
import { createRoot, Root } from "react-dom/client";

import { useMeetingSocket } from "./useMeetingSocket";

type HandlerMap = {
  snapshot: Array<(data: unknown) => void>;
  delta: Array<(data: unknown) => void>;
  joined: Array<(participantId: string, meetingId: string) => void>;
  meetingEnded: Array<(message?: string) => void>;
  meetingNotStarted: Array<(message?: string) => void>;
  meetingStarted: Array<(meetingId: string) => void>;
  meetingSummary: Array<(data: any) => void>;
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
    meetingSummary: [],
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

  onMeetingEnded(handler: (message?: string) => void) {
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

  onMeetingSummary(handler: (data: any) => void) {
    this.handlers.meetingSummary.push(handler);
    return () => this.unregister("meetingSummary", handler);
  }

  onError(handler: (message: string) => void) {
    this.handlers.error.push(handler);
    return () => this.unregister("error", handler);
  }

  onStateChange(handler: (state: "connected" | "connecting" | "disconnected" | "ended" | "not_started") => void) {
    this.handlers.stateChange.push(handler);
    return () => this.unregister("stateChange", handler);
  }

  emitSummary(data: any) {
    this.handlers.meetingSummary.forEach((h) => h(data));
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

  it("moves to summary state when meeting_summary message arrives", async () => {
    let hookState:
      | ReturnType<typeof useMeetingSocket>
      | null = null;

    function TestComponent() {
      hookState = useMeetingSocket("meeting-123", "fp-abc");
      return null;
    }

    root = createRoot(container!);

    await act(async () => {
      root!.render(<TestComponent />);
    });

    const { __getLastSocket } = await import("../services/meetingSocket");
    const socket = __getLastSocket() as MockMeetingSocket | null;

    expect(socket).not.toBeNull();

    await act(async () => {
      socket!.emitSummary({
        meeting_id: "meeting-123",
        city_name: "Paris",
        meeting_room_name: "Louvre",
        ms_teams_invite_url: "https://teams.test",
        start_ts: "2024-01-01T10:00:00Z",
        end_ts: "2024-01-01T11:00:00Z",
        duration_minutes: 60,
        max_participants: 5,
        normalized_engagement: 0.8,
        engagement_level: "high",
      });
    });

    expect(hookState?.summaryData?.meetingId).toBe("meeting-123");
    expect(hookState?.summaryData?.cityName).toBe("Paris");
    expect(hookState?.meetingEnded).toBe(true);
  });
});

