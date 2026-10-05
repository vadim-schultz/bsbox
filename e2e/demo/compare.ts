import type { SessionResult } from '@bsbox/shared';
import type { Expected } from './groundTruth';
import type { Check } from './types';

export const SCORE_TOLERANCE = 0.02;

const check = (name: string, ok: boolean, detail: string): Check => ({ name, ok, detail });

function equal<T>(label: string, name: string, want: T, got: T): Check {
  return check(`${label} ${name}`, want === got, `expected ${want}, got ${got}`);
}

function minuteDiffs(want: Expected['minutes'], got: SessionResult['minutes']): string[] {
  const rows = Math.max(want.length, got.length);
  const cell = (m?: { present: number; engaged: number }) =>
    m ? `${m.present}/${m.engaged}` : 'none';
  return Array.from({ length: rows }, (_, i) => [i, cell(want[i]), cell(got[i])] as const)
    .filter(([, w, g]) => w !== g)
    .map(([i, w, g]) => `minute ${i}: expected ${w}, got ${g}`);
}

function minutesCheck(label: string, want: Expected, got: SessionResult): Check {
  const diffs = minuteDiffs(want.minutes, got.minutes);
  return check(`${label} minutes`, diffs.length === 0, diffs.join('; ') || 'all minutes match');
}

function scoreCheck(label: string, want: Expected, got: SessionResult): Check {
  const delta = Math.abs(want.score - got.score);
  const detail = `expected ${want.score.toFixed(3)}, got ${got.score.toFixed(3)}`;
  return check(`${label} score within ${SCORE_TOLERANCE}`, delta <= SCORE_TOLERANCE, detail);
}

/** One check per compared field, named "<label> <field>". */
export function compareResults(label: string, want: Expected, got: SessionResult): Check[] {
  return [
    equal(label, 'level', want.level, got.level),
    scoreCheck(label, want, got),
    equal(label, 'peak', want.peak, got.peak),
    equal(label, 'participationRate', want.participationRate, got.participationRate),
    minutesCheck(label, want, got),
  ];
}
