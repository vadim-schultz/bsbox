export interface Limits {
  p95Ms: number;
  maxErrorRate: number;
}

export interface Measurements {
  /** Vote-to-next-tick latencies observed by the clients. */
  latenciesMs: number[];
  /** Operations tried (connections plus votes); the denominator of the error rate. */
  attempts: number;
  errors: number;
}

export interface Evaluation {
  ok: boolean;
  p95Ms: number;
  errorRate: number;
  failures: string[];
}

/** Nearest-rank percentile (p in 0..1); 0 for an empty sample. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return sorted[rank - 1] ?? 0;
}

export function evaluate(m: Measurements, limits: Limits): Evaluation {
  const p95Ms = percentile(m.latenciesMs, 0.95);
  const errorRate = m.attempts === 0 ? 1 : m.errors / m.attempts;
  const failures: string[] = [];
  if (errorRate > limits.maxErrorRate) {
    failures.push(`error rate ${errorRate.toFixed(4)} exceeds ${limits.maxErrorRate}`);
  }
  if (m.latenciesMs.length === 0) failures.push('no tick was received');
  else if (p95Ms > limits.p95Ms) failures.push(`tick p95 ${p95Ms}ms exceeds ${limits.p95Ms}ms`);
  return { ok: failures.length === 0, p95Ms, errorRate, failures };
}
