import { runLoad } from './run';

/**
 * WebSocket load test: N clients vote against a LOCAL `wrangler dev` (never a real account).
 * Env: BASE_URL, CLIENTS, DURATION_S, VOTE_EVERY_MS, P95_MS, MAX_ERROR_RATE.
 */
const num = (name: string, fallback: number): number => Number(process.env[name] ?? fallback);

const baseUrl = process.env.BASE_URL ?? 'http://localhost:8788';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) {
  console.error(`refusing to load-test a non-local target: ${baseUrl}`);
  process.exit(2);
}

const report = await runLoad({
  baseUrl,
  clients: num('CLIENTS', 50),
  durationS: num('DURATION_S', 30),
  voteEveryMs: num('VOTE_EVERY_MS', 2000),
  limits: { p95Ms: num('P95_MS', 6500), maxErrorRate: num('MAX_ERROR_RATE', 0.01) },
  log: (line) => console.log(line),
});
process.exit(report.exitCode);
