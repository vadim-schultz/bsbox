/**
 * WebSocket service for real-time meeting communication.
 *
 * Handles connection lifecycle, message routing, and automatic reconnection.
 * Uses connection-based identity (no fingerprints needed).
 */

import type { StatusLiteral } from "../types/dto";

/** Messages sent from client to server */
type WSMessage =
  | { type: "join"; fingerprint: string }
  | { type: "status"; status: StatusLiteral }
  | { type: "ping" };

/** Responses received from server */
type WSResponse =
  | { type: "snapshot"; data: unknown }
  | { type: "delta"; data: unknown }
  | { type: "joined"; participant_id: string; meeting_id: string }
  | { type: "pong"; server_time: string }
  | { type: "error"; message: string }
  | { type: "meeting_ended" };

type ConnectionState = "disconnected" | "connecting" | "connected" | "ended";

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
    snapshot: [] as ((data: unknown) => void)[],
    delta: [] as ((data: unknown) => void)[],
    joined: [] as ((participantId: string, meetingId: string) => void)[],
    meetingEnded: [] as (() => void)[],
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
    const url = `${protocol}://${window.location.host}/ws/meetings/${meetingId}`;

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
        this.handleMessage(JSON.parse(event.data as string) as WSResponse);
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
  onSnapshot(handler: (data: unknown) => void): () => void {
    this.handlers.snapshot.push(handler);
    return () => {
      const idx = this.handlers.snapshot.indexOf(handler);
      if (idx !== -1) this.handlers.snapshot.splice(idx, 1);
    };
  }

  /** Register delta handler */
  onDelta(handler: (data: unknown) => void): () => void {
    this.handlers.delta.push(handler);
    return () => {
      const idx = this.handlers.delta.indexOf(handler);
      if (idx !== -1) this.handlers.delta.splice(idx, 1);
    };
  }

  /** Register meeting ended handler */
  onMeetingEnded(handler: () => void): () => void {
    this.handlers.meetingEnded.push(handler);
    return () => {
      const idx = this.handlers.meetingEnded.indexOf(handler);
      if (idx !== -1) this.handlers.meetingEnded.splice(idx, 1);
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
        this.handlers.meetingEnded.forEach((h) => h());
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
