export interface StoredSeries {
  code: string;
  editToken?: string;
}

/** Office recurrence as exposed by compose; only the fields BSBox maps. */
export interface ItemRecurrence {
  recurrenceType: string;
  recurrenceProperties?: { interval?: number; days?: string[] };
}

export interface ItemSnapshot {
  subject: string;
  start: Date;
  end: Date;
  recurrence: ItemRecurrence | null;
  bodyText: string;
}

export type ComposeState =
  | { status: 'not_added' }
  | { status: 'adding' }
  | { status: 'added'; code: string; joinUrl: string }
  | { status: 'error' };

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export type ReadState =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'found'; code: string; joinUrl: string }
  | { status: 'unavailable' };

/** Slice of the teams-js app context BSBox uses. */
export interface TeamsContext {
  theme?: string;
  locale?: string;
  meetingId?: string;
  chatId?: string;
}

export interface TeamsMeeting {
  joinUrl?: string;
  title?: string;
  threadId?: string;
  start?: Date;
  end?: Date;
}

export interface TeamsHostInfo {
  context: TeamsContext;
  meeting: TeamsMeeting | null;
}

export type TeamsPanelState =
  | { status: 'loading' }
  | { status: 'outside' }
  | { status: 'error' }
  | { status: 'ready'; code: string; joinUrl: string; host: TeamsHostInfo };
