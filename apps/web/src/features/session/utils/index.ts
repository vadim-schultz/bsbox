export const DRIFT_WARN_MS = 5_000;

/** `m:ss` under an hour, `h:mm:ss` otherwise; never negative. */
export function formatCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.ceil(remainingMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Device clock ahead (positive) or behind (negative) of the server; offset = server - device. */
export const isDrifting = (offsetMs: number): boolean => Math.abs(offsetMs) > DRIFT_WARN_MS;
