/**
 * WebSocket service for real-time meeting communication.
 *
 * Handles connection lifecycle, message routing, and automatic reconnection.
 * Uses connection-based identity (no fingerprints needed).
 */

import type { EngagementSummaryDto, StatusLiteral } from "../types/dto";
import type { DeltaMessageData } from "../types/ws";

/** Messages sent from client to server */
type WSMessage =
  | { type: "join"; fingerprint: string }
  | { type: "status"; status: StatusLiteral }
  | { type: "ping" };

/** Responses received from server */
type WSResponse =
  | { type: "snapshot"; data: EngagementSummaryDto }
  | { type: "delta"; data: DeltaMessageData }
  | { type: "joined"; participant_id: string; meeting_id: string; snapshot: EngagementSummaryDto }
  | { type: "pong"; server_time: string }
  | { type: "error"; message: string }
  | { type: "meeting_ended"; message?: string; end_time?: string }
  | { type: "meeting_not_started"; message?: string; start_time?: string }
  | {
      type: "meeting_countdown";
      meeting_id: string;
      start_time: string;
      server_time: string;
      city_name?: string | null;
      meeting_room_name?: string | null;
    }
  | { type: "meeting_started"; meeting_id: string; message?: string }
  | {
      type: "meeting_summary";
      meeting_id: string;
      city_name?: string | null;
      meeting_room_name?: string | null;
      ms_teams_invite_url?: string | null;
      start_ts: string;
      end_ts: string;
      duration_minutes: number;
      max_participants: number;
      normalized_engagement: number;
      engagement_level: "high" | "healthy" | "passive" | "low";
    };

type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "ended"
  | "not_started";

export class MeetingSocket {
  private ws: WebSocket | null = null;
  private participantId: string | null = null;
  private meetingId: string | null = null;
  private deviceFingerprint: string | null = null;
  private pingInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private connectionState: ConnectionState = "disconnected";

  private handlers = {
    snapshot: [] as ((data: EngagementSummaryDto) => void)[],
    delta: [] as ((data: DeltaMessageData) => void)[],
    joined: [] as ((participantId: string, meetingId: string) => void)[],
    meetingEnded: [] as ((message?: string) => void)[],
    meetingNotStarted: [] as ((message?: string) => void)[],
    meetingStarted: [] as ((meetingId: string) => void)[],
    meetingSummary: [] as ((data: {
      meeting_id: string;
      city_name?: string | null;
      meeting_room_name?: string | null;
      ms_teams_invite_url?: string | null;
      start_ts: string;
      end_ts: string;
      duration_minutes: number;
      max_participants: number;
      normalized_engagement: number;
      engagement_level: "high" | "healthy" | "passive" | "low";
    }) => void)[],
    countdown: [] as ((data: {
      meeting_id: string;
      start_time: string;
      server_time: string;
      city_name?: string | null;
      meeting_room_name?: string | null;
    }) => void)[],
    error: [] as ((message: string) => void)[],
    stateChange: [] as ((state: ConnectionState) => void)[],
  };

  /** Get current participant ID (available after successful join) */
  getParticipantId(): string | null {
    return this.participantId;
  }

  /** Get current meeting ID */
  getMeetingId(): string | null {
    return this.meetingId;
  }

  /** Get current connection state */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /** Connect to a meeting's WebSocket endpoint */
  async connect(meetingId: string): Promise<void> {
    if (
      this.connectionState === "connecting" ||
      this.connectionState === "connected"
    ) {
      console.log("[WS] Already connected or connecting");
      return;
    }

    this.meetingId = meetingId;
    this.setConnectionState("connecting");

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const apiBase = import.meta.env.VITE_API_BASE ?? "";
    const url = `${protocol}://${window.location.host}${apiBase}/ws/meetings/${meetingId}`;

    return new Promise((resolve, reject) => {
      console.log("[WS] Connecting to:", url);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log("[WS] Connected successfully");
        this.setConnectionState("connected");
        this.reconnectAttempts = 0;
        this.startPing();
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error("[WS] Connection error:", error);
        this.handlers.error.forEach((h) => h("WebSocket connection error"));
        reject(new Error("WebSocket connection failed"));
      };

      this.ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data as string) as WSResponse;
          this.handleMessage(response);
        } catch (err) {
          console.error("[WS] Failed to parse message:", err, event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log("[WS] Connection closed:", event.code, event.reason);
        this.stopPing();
        this.ws = null;

        if (event.code === 1000 && event.reason === "Meeting ended") {
          this.setConnectionState("ended");
          this.handlers.meetingEnded.forEach((h) => h());
        } else if (this.connectionState !== "ended") {
          this.setConnectionState("disconnected");
          this.scheduleReconnect();
        }
      };
    });
  }

  /** Join the meeting as a participant (creates new participant per connection) */
  async join(fingerprint: string): Promise<string> {
    if (!this.ws || this.connectionState !== "connected") {
      throw new Error("Not connected");
    }

    if (!fingerprint) {
      throw new Error("Missing device fingerprint");
    }

    this.deviceFingerprint = fingerprint;
    this.send({ type: "join", fingerprint });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Join timeout"));
      }, 10000);

      const joinHandler = (participantId: string) => {
        clearTimeout(timeout);
        this.participantId = participantId;
        // Remove this one-time handler
        const idx = this.handlers.joined.indexOf(joinHandler);
        if (idx !== -1) this.handlers.joined.splice(idx, 1);
        resolve(participantId);
      };

      const errorHandler = (message: string) => {
        clearTimeout(timeout);
        const idx = this.handlers.error.indexOf(errorHandler);
        if (idx !== -1) this.handlers.error.splice(idx, 1);
        reject(new Error(message));
      };

      this.handlers.joined.push(joinHandler);
      this.handlers.error.push(errorHandler);
    });
  }

  /** Send a status update */
  sendStatus(status: StatusLiteral): void {
    if (!this.participantId) {
      console.warn("[WS] Cannot send status: not joined");
      return;
    }
    this.send({ type: "status", status });
  }

  /** Register snapshot handler */
  onSnapshot(handler: (data: EngagementSummaryDto) => void): () => void {
    this.handlers.snapshot.push(handler);
    return () => {
      const idx = this.handlers.snapshot.indexOf(handler);
      if (idx !== -1) this.handlers.snapshot.splice(idx, 1);
    };
  }

  /** Register delta handler */
  onDelta(handler: (data: DeltaMessageData) => void): () => void {
    this.handlers.delta.push(handler);
    return () => {
      const idx = this.handlers.delta.indexOf(handler);
      if (idx !== -1) this.handlers.delta.splice(idx, 1);
    };
  }

  /** Register meeting ended handler */
  onMeetingEnded(handler: (message?: string) => void): () => void {
    this.handlers.meetingEnded.push(handler);
    return () => {
      const idx = this.handlers.meetingEnded.indexOf(handler);
      if (idx !== -1) this.handlers.meetingEnded.splice(idx, 1);
    };
  }

  /** Register meeting not started handler */
  onMeetingNotStarted(handler: (message?: string) => void): () => void {
    this.handlers.meetingNotStarted.push(handler);
    return () => {
      const idx = this.handlers.meetingNotStarted.indexOf(handler);
      if (idx !== -1) this.handlers.meetingNotStarted.splice(idx, 1);
    };
  }

  /** Register countdown handler */
  onCountdown(handler: (data: {
    meeting_id: string;
    start_time: string;
    server_time: string;
    city_name?: string | null;
    meeting_room_name?: string | null;
  }) => void): () => void {
    this.handlers.countdown.push(handler);
    return () => {
      const idx = this.handlers.countdown.indexOf(handler);
      if (idx !== -1) this.handlers.countdown.splice(idx, 1);
    };
  }

  /** Register meeting started handler */
  onMeetingStarted(handler: (meetingId: string) => void): () => void {
    this.handlers.meetingStarted.push(handler);
    return () => {
      const idx = this.handlers.meetingStarted.indexOf(handler);
      if (idx !== -1) this.handlers.meetingStarted.splice(idx, 1);
    };
  }

  /** Register meeting summary handler */
  onMeetingSummary(handler: (data: {
    meeting_id: string;
    city_name?: string | null;
    meeting_room_name?: string | null;
    ms_teams_invite_url?: string | null;
    start_ts: string;
    end_ts: string;
    duration_minutes: number;
    max_participants: number;
    normalized_engagement: number;
    engagement_level: "high" | "healthy" | "passive" | "low";
  }) => void): () => void {
    this.handlers.meetingSummary.push(handler);
    return () => {
      const idx = this.handlers.meetingSummary.indexOf(handler);
      if (idx !== -1) this.handlers.meetingSummary.splice(idx, 1);
    };
  }

  /** Register error handler */
  onError(handler: (message: string) => void): () => void {
    this.handlers.error.push(handler);
    return () => {
      const idx = this.handlers.error.indexOf(handler);
      if (idx !== -1) this.handlers.error.splice(idx, 1);
    };
  }

  /** Register connection state change handler */
  onStateChange(handler: (state: ConnectionState) => void): () => void {
    this.handlers.stateChange.push(handler);
    return () => {
      const idx = this.handlers.stateChange.indexOf(handler);
      if (idx !== -1) this.handlers.stateChange.splice(idx, 1);
    };
  }

  /** Disconnect and cleanup */
  disconnect(): void {
    this.stopPing();
    this.clearReconnectTimeout();
    this.setConnectionState("disconnected");

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.participantId = null;
    this.reconnectAttempts = 0;
  }

  private send(msg: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn("[WS] Cannot send message: not connected");
    }
  }

  private handleMessage(response: WSResponse): void {
    switch (response.type) {
      case "snapshot":
        this.handlers.snapshot.forEach((h) => h(response.data));
        break;
      case "delta":
        this.handlers.delta.forEach((h) => h(response.data));
        break;
      case "joined":
        this.participantId = response.participant_id;
        // Trigger snapshot handlers with embedded snapshot data
        if (response.snapshot) {
          this.handlers.snapshot.forEach((h) => h(response.snapshot));
        }
        this.handlers.joined.forEach((h) =>
          h(response.participant_id, response.meeting_id)
        );
        break;
      case "pong":
        // Keepalive acknowledged, no action needed
        break;
      case "error":
        console.error("[WS] Server error:", response.message);
        this.handlers.error.forEach((h) => h(response.message));
        break;
      case "meeting_ended":
        this.setConnectionState("ended");
        this.handlers.meetingEnded.forEach((h) => h(response.message));
        break;
      case "meeting_not_started":
        this.setConnectionState("not_started");
        this.handlers.meetingNotStarted.forEach((h) => h(response.message));
        break;
      case "meeting_countdown":
        this.handlers.countdown.forEach((h) => h({
          meeting_id: response.meeting_id,
          start_time: response.start_time,
          server_time: response.server_time,
          city_name: response.city_name,
          meeting_room_name: response.meeting_room_name,
        }));
        break;
      case "meeting_started":
        console.log("[WS] Meeting started notification received");
        this.handlers.meetingStarted.forEach((h) => h(response.meeting_id));
        break;
      case "meeting_summary":
        console.log("[WS] Meeting summary received");
        this.setConnectionState("ended");
        this.handlers.meetingSummary.forEach((h) => h({
          meeting_id: response.meeting_id,
          city_name: response.city_name,
          meeting_room_name: response.meeting_room_name,
          ms_teams_invite_url: response.ms_teams_invite_url,
          start_ts: response.start_ts,
          end_ts: response.end_ts,
          duration_minutes: response.duration_minutes,
          max_participants: response.max_participants,
          normalized_engagement: response.normalized_engagement,
          engagement_level: response.engagement_level,
        }));
        break;
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.handlers.stateChange.forEach((h) => h(state));
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = window.setInterval(() => {
      this.send({ type: "ping" });
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval !== null) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.connectionState === "ended" || !this.meetingId) {
      return;
    }

    this.reconnectAttempts++;
    const baseDelay = Math.min(3000 * 2 ** (this.reconnectAttempts - 1), 30000);
    const jitter = Math.floor(Math.random() * 500);
    const delay = baseDelay + jitter;

    console.log(
      `[WS] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`
    );

    this.clearReconnectTimeout();
    this.reconnectTimeout = window.setTimeout(() => {
      if (this.meetingId && this.connectionState === "disconnected") {
        void this.connect(this.meetingId).then(() => {
          // Re-join after reconnect
          if (this.connectionState === "connected") {
              const fp = this.deviceFingerprint;
              if (!fp) {
                console.error("[WS] Missing fingerprint for reconnect");
                return;
              }
              void this.join(fp).catch((err) => {
              console.error("[WS] Re-join failed:", err);
            });
          }
        });
      }
    }, delay);
  }
}
