/** Exponential moving average; the first value is kept as is. Used only for the chart line. */
export function ema(values: readonly number[], alpha: number): number[] {
  const out: number[] = [];
  for (const v of values) {
    const prev = out.at(-1);
    out.push(prev === undefined ? v : alpha * v + (1 - alpha) * prev);
  }
  return out;
}
