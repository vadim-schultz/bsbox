import { personasA, personasB } from './personas';
import type { Persona } from './types';

export type RoomKey = 'A' | 'B' | 'C';

export interface Scenario {
  title: string;
  durationMin: number;
  personas: readonly Persona[];
  /** A socket that connects but never says hello. */
  ghost: boolean;
}

export const scenarios: Record<RoomKey, Scenario> = {
  A: { title: 'Team sync', durationMin: 8, personas: personasA, ghost: false },
  B: { title: 'Quiet standup', durationMin: 5, personas: personasB, ghost: false },
  C: { title: 'Ghost room', durationMin: 5, personas: [], ghost: true },
};
