import { describe, expect, it } from 'vitest';
import { actionsFor, joinOffsetSec } from './schedule';
import type { Persona } from './types';

const base: Persona = { name: 'p', count: 1, script: [], joinMin: 0 };

describe('joinOffsetSec', () => {
  it('is null for lobby joiners and inside the minute for late ones', () => {
    expect(joinOffsetSec(base)).toBeNull();
    expect(joinOffsetSec({ ...base, joinMin: 4 })).toBe(245);
  });
});

describe('actionsFor', () => {
  it('sends each scripted tap 10 s into its minute and skips carried minutes', () => {
    const a = actionsFor({ ...base, script: ['engaged', null, 'disengaged'] });
    expect(a).toEqual([
      { atSec: 10, kind: 'vote', status: 'engaged' },
      { atSec: 130, kind: 'vote', status: 'disengaged' },
    ]);
  });

  it('closes the socket during leaveMin', () => {
    expect(actionsFor({ ...base, leaveMin: 3 })).toEqual([{ atSec: 205, kind: 'leave' }]);
  });

  it('drops then reconnects within the same minute', () => {
    const kinds = actionsFor({ ...base, reconnectMin: 2 }).map((a) => [a.atSec, a.kind]);
    expect(kinds).toEqual([
      [140, 'drop'],
      [150, 'reconnect'],
    ]);
  });

  it('flaps against the scripted tap early in the minute and ends on it', () => {
    const a = actionsFor({ ...base, flap: true, script: ['engaged'] });
    const statuses = a.map((x) => x.status);
    expect(statuses).toEqual(['disengaged', 'engaged', 'disengaged', 'engaged']);
    expect(a.at(-1)?.atSec).toBe(10);
  });

  it('returns actions in time order', () => {
    const a = actionsFor({ ...base, script: ['engaged', 'engaged'], leaveMin: 1 });
    expect(a.map((x) => x.atSec)).toEqual([10, 70, 85]);
  });
});
