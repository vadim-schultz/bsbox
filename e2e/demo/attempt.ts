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

/** Bounds a step so a stuck browser can never hang the run. */
export async function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
  });
  try {
    return await Promise.race([work, limit]);
  } finally {
    clearTimeout(timer);
  }
}
