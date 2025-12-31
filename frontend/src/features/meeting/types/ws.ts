import type { StatusLiteral } from "./dto";

export type SnapshotMessage = {
  type: "snapshot";
  data: unknown;
};

export type DeltaMessageData = {
  meeting_id: string;
  participant_id: string;
  bucket: string;
  status: StatusLiteral;
  overall: number;
  participants: Record<string, number>;
};

export type DeltaMessage = {
  type: "delta";
  data: DeltaMessageData;
};

export type PongMessage = {
  type: "pong";
};

export type MeetingCountdownMessage = {
  type: "meeting_countdown";
  meeting_id: string;
  start_time: string;
  server_time: string;
  city_name?: string | null;
  meeting_room_name?: string | null;
};

export type EngagementMessage = SnapshotMessage | DeltaMessage | PongMessage | MeetingCountdownMessage;

