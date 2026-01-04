/**
 * Tests for MeetingSocket snapshot/delta handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MeetingSocket } from "./meetingSocket";

// Mock WebSocket
class MockWebSocket {
  public readyState = WebSocket.OPEN;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 0);
  }

  send(data: string): void {
    // Mock send - do nothing
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close", { code: 1000 }));
    }
  }

  // Helper to simulate receiving a message
  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(
        new MessageEvent("message", {
          data: JSON.stringify(data),
        })
      );
    }
  }
}

describe("MeetingSocket - Snapshot/Delta Handling", () => {
  let socket: MeetingSocket;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    // Mock global WebSocket
    mockWebSocket = new MockWebSocket("ws://test");
    vi.stubGlobal("WebSocket", vi.fn(() => mockWebSocket));
    socket = new MeetingSocket();
  });

  afterEach(() => {
    socket.disconnect();
    vi.unstubAllGlobals();
  });

  it("should trigger snapshot handler when join response includes snapshot", async () => {
    const snapshotHandler = vi.fn();

    socket.onSnapshot(snapshotHandler);

    // Connect
    await socket.connect("test-meeting");

    // Simulate join response with embedded snapshot
    const joinResponse = {
      type: "joined",
      participant_id: "p123",
      meeting_id: "test-meeting",
      snapshot: {
        meeting_id: "test-meeting",
        start: "2024-01-01T10:00:00Z",
        end: "2024-01-01T11:00:00Z",
        bucket_minutes: 1,
        overall: [],
        participants: [],
      },
    };

    mockWebSocket.simulateMessage(joinResponse);

    // Snapshot handler should be called with the snapshot data
    expect(snapshotHandler).toHaveBeenCalledWith(joinResponse.snapshot);
    expect(snapshotHandler).toHaveBeenCalledTimes(1);

    // Verify participant ID is set
    expect(socket.getParticipantId()).toBe("p123");
  });

  it("should handle snapshot in join response before delta messages", async () => {
    const snapshotHandler = vi.fn();
    const deltaHandler = vi.fn();

    socket.onSnapshot(snapshotHandler);
    socket.onDelta(deltaHandler);

    await socket.connect("test-meeting");

    // Simulate join response with snapshot
    mockWebSocket.simulateMessage({
      type: "joined",
      participant_id: "p123",
      meeting_id: "test-meeting",
      snapshot: {
        meeting_id: "test-meeting",
        start: "2024-01-01T10:00:00Z",
        end: "2024-01-01T11:00:00Z",
        bucket_minutes: 1,
        overall: [],
        participants: [],
      },
    });

    // Simulate delta message
    mockWebSocket.simulateMessage({
      type: "delta",
      data: {
        meeting_id: "test-meeting",
        participant_id: "p123",
        bucket: "2024-01-01T10:05:00Z",
        status: "engaged",
        overall: 50,
        participants: { p123: 50 },
      },
    });

    // Both handlers should be called
    expect(snapshotHandler).toHaveBeenCalledTimes(1);
    expect(deltaHandler).toHaveBeenCalledTimes(1);
  });

  it("should handle delta messages via broadcast channel", async () => {
    const deltaHandler = vi.fn();
    socket.onDelta(deltaHandler);

    await socket.connect("test-meeting");

    // Simulate delta broadcast (not from join response)
    const deltaData = {
      meeting_id: "test-meeting",
      participant_id: "p456",
      bucket: "2024-01-01T10:05:00Z",
      status: "engaged",
      overall: 75,
      participants: { p123: 50, p456: 100 },
    };

    mockWebSocket.simulateMessage({
      type: "delta",
      data: deltaData,
    });

    expect(deltaHandler).toHaveBeenCalledWith(deltaData);
    expect(deltaHandler).toHaveBeenCalledTimes(1);
  });

  it("should not call snapshot handler if join response has no snapshot", async () => {
    const snapshotHandler = vi.fn();

    socket.onSnapshot(snapshotHandler);

    await socket.connect("test-meeting");

    // Simulate old-style join response without snapshot (for backward compatibility test)
    // Note: This shouldn't happen with the new backend, but test defensive handling
    mockWebSocket.simulateMessage({
      type: "joined",
      participant_id: "p123",
      meeting_id: "test-meeting",
      // No snapshot field
    });

    // Snapshot handler should NOT be called
    expect(snapshotHandler).not.toHaveBeenCalled();

    // Participant ID should still be set
    expect(socket.getParticipantId()).toBe("p123");
  });

  it("should handle multiple delta messages in sequence", async () => {
    const deltaHandler = vi.fn();
    socket.onDelta(deltaHandler);

    await socket.connect("test-meeting");

    // Simulate multiple delta messages
    const delta1 = {
      meeting_id: "test-meeting",
      participant_id: "p123",
      bucket: "2024-01-01T10:00:00Z",
      status: "engaged",
      overall: 50,
      participants: { p123: 50 },
    };

    const delta2 = {
      meeting_id: "test-meeting",
      participant_id: "p456",
      bucket: "2024-01-01T10:01:00Z",
      status: "engaged",
      overall: 75,
      participants: { p123: 50, p456: 100 },
    };

    mockWebSocket.simulateMessage({ type: "delta", data: delta1 });
    mockWebSocket.simulateMessage({ type: "delta", data: delta2 });

    expect(deltaHandler).toHaveBeenCalledTimes(2);
    expect(deltaHandler).toHaveBeenNthCalledWith(1, delta1);
    expect(deltaHandler).toHaveBeenNthCalledWith(2, delta2);
  });
});

