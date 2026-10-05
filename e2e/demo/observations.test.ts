import { describe, expect, it } from 'vitest';
import { observationsFrom, type Evidence } from './observations';

const seen: Evidence = {
  lateJoinTimelineLen: 0,
  lobbyTicks: 0,
  untouchedState: 'scheduled',
  historyItemHasResult: false,
  staleTokenSockets: 6,
};

describe('observationsFrom', () => {
  it('reports each known gap as observed when the evidence shows it', () => {
    const lines = observationsFrom(seen);
    expect(lines).toHaveLength(5);
    expect(lines.every((l) => l.includes('[observed'))).toBe(true);
  });

  it('says not reproduced when the evidence contradicts a gap', () => {
    const lines = observationsFrom({ ...seen, lateJoinTimelineLen: 3 });
    expect(lines[0]).toContain('[not reproduced');
  });

  it('says not measured when a probe produced no evidence', () => {
    const lines = observationsFrom({});
    expect(lines.every((l) => l.includes('[not measured]'))).toBe(true);
  });

  it('includes the measured values', () => {
    expect(observationsFrom(seen)[4]).toContain('6 socket attempts');
    expect(observationsFrom(seen)[2]).toContain('"scheduled"');
  });
});
