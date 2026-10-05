import type { Check } from './types';

/** Runs one check; a throw becomes a failed Check instead of aborting the run. */
export async function attempt(name: string, fn: () => Promise<string | void>): Promise<Check> {
  try {
    return { name, ok: true, detail: (await fn()) || 'ok' };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export function expectEqual<T>(what: string, want: T, got: T): void {
  if (want !== got) throw new Error(`${what}: expected ${want}, got ${got}`);
}
