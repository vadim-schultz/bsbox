const t0 = Date.now();

/** One timestamped line on stdout, e.g. `[ 95s] session A: live`. */
export function log(line: string): void {
  const s = String(Math.round((Date.now() - t0) / 1000)).padStart(4);
  console.log(`[${s}s] ${line}`);
}

export const sleepUntil = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, Math.max(0, ms - Date.now())));
