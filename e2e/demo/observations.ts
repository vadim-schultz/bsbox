export interface Evidence {
  /** Length of `welcome.timeline` for a participant who joined mid-meeting. */
  lateJoinTimelineLen?: number;
  /** Ticks received by lobby bots before the meeting started. */
  lobbyTicks?: number;
  /** Session state reported by REST after the end for a room no socket ever touched. */
  untouchedState?: string;
  /** Whether the history list item for a finalized session carries its result. */
  historyItemHasResult?: boolean;
  /** WebSocket attempts the web client made in ~10 s with a stale token. */
  staleTokenSockets?: number;
}

type Verdict = { seen: boolean; value: string } | undefined;

function line(gap: string, verdict: Verdict): string {
  if (!verdict) return `${gap} [not measured]`;
  const tag = verdict.seen ? 'observed' : 'not reproduced';
  return `${gap} [${tag}: ${verdict.value}]`;
}

const when = <T>(v: T | undefined, test: (v: T) => boolean, show: (v: T) => string): Verdict =>
  v === undefined ? undefined : { seen: test(v), value: show(v) };

/** The plan's known gaps, each backed by evidence gathered during the run. Never fails the run. */
export function observationsFrom(e: Evidence): string[] {
  return [
    line(
      'welcome.timeline is always [], so late joiners see no history',
      when(
        e.lateJoinTimelineLen,
        (n) => n === 0,
        (n) => `late joiner got ${n} rows`,
      ),
    ),
    line(
      'No ticks are sent in the lobby, so lobby presence stays 0',
      when(
        e.lobbyTicks,
        (n) => n === 0,
        (n) => `${n} ticks before start`,
      ),
    ),
    line(
      'A session no socket ever touched is never finalized',
      when(
        e.untouchedState,
        (s) => s !== 'ended',
        (s) => `state is "${s}" after its end`,
      ),
    ),
    line(
      'History list items carry no result (UI shows "No result")',
      when(
        e.historyItemHasResult,
        (has) => !has,
        (has) => `item has result: ${has}`,
      ),
    ),
    line(
      'The web client retries a stale token forever (4401 loop)',
      when(
        e.staleTokenSockets,
        (n) => n >= 4,
        (n) => `${n} socket attempts in 10 s with no welcome`,
      ),
    ),
  ];
}
