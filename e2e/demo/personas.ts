import type { Persona, Tap } from './types';

export const MIN_AUDIENCE_A = 18;

const E = 'engaged';
const S = 'speaking';
const D = 'disengaged';
const quiet: readonly Tap[] = [];

const persona = (
  name: string,
  count: number,
  script: readonly Tap[],
  rest: Partial<Persona> = {},
): Persona => ({
  name,
  count,
  script,
  joinMin: 0,
  ...rest,
});

/** Session A, "Team sync": 8 minutes with warm-up, a dip at 3-4 and a recovery at 5-6. */
export const personasA: readonly Persona[] = [
  persona('enthusiast', 2, [E]),
  persona('speaker', 2, [E, null, null, S, null, E]),
  persona('drifter', 4, [E, null, null, D, null, null, E]),
  persona('lurker', 3, quiet),
  persona('late-joiner', 2, [null, null, null, null, null, E], { joinMin: 4 }),
  persona('early-leaver', 2, [E], { leaveMin: 3 }),
  persona('flapper', 1, [E, D, E, D, D, E, E, D], { flap: true }),
  persona('reconnector', 1, [E], { reconnectMin: 2 }),
  persona('withdrawer', 1, [E, null, D]),
];

/** Session B, "Quiet standup": 5 minutes, ten people, hardly anyone taps. */
export const personasB: readonly Persona[] = [
  persona('lurker', 7, quiet),
  persona('one-tap', 2, [E, null, D]),
  persona('steady', 1, [E]),
];

/** Windows that sit in session A without ever tapping; they only count as present. */
export const observers = (count: number): Persona => persona('observer', count, quiet);
