/** Structured, PII-free logging and Analytics Engine datapoints. The only place that may call `console`. */

const SENSITIVE_KEY = /authorization|token|participant|cookie|secret/i;
const REDACTED = '[redacted]';

export interface LogEvent {
  level?: 'info' | 'error';
  event: string;
  code?: string;
  durationMs: number;
  url?: string;
  [field: string]: unknown;
}

/** Replaces token-like query values; unparseable input never reaches the log. */
export function redactUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return '[invalid-url]';
  }
  for (const key of [...url.searchParams.keys()]) {
    if (SENSITIVE_KEY.test(key)) url.searchParams.set(key, REDACTED);
  }
  return url.toString();
}

export function logEvent({ level = 'info', url, ...rest }: LogEvent): void {
  const line: Record<string, unknown> = { level };
  for (const [key, value] of Object.entries(rest)) {
    line[key] = SENSITIVE_KEY.test(key) ? REDACTED : value;
  }
  if (url !== undefined) line.url = redactUrl(url);
  const out = JSON.stringify(line);
  if (level === 'error') console.error(out);
  else console.log(out);
}

export interface MetricsEnv {
  EVENTS?: {
    writeDataPoint(point: { blobs: string[]; doubles: number[]; indexes: string[] }): void;
  };
}

/** Counts joins, votes, finalizations and error codes. No-op when the dataset is not bound. */
export function recordMetric(env: MetricsEnv, name: string, code = 'ok'): void {
  env.EVENTS?.writeDataPoint({ blobs: [name, code], doubles: [1], indexes: [name] });
}
