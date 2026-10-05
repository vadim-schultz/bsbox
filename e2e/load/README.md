# WebSocket load test

`ws-load.ts` joins N simulated participants to one live session on a **local** `wrangler dev`
(it refuses non-local targets) and votes every 2 s. It measures vote-to-next-tick latency (ticks
are coalesced every 5 s by the room alarm) and the error rate, and exits non-zero when p95 or the
error rate exceeds its limit.

```bash
bash e2e/scripts/start-worker.sh &        # port 8788, ENVIRONMENT=test
CLIENTS=100 DURATION_S=60 pnpm --filter @bsbox/e2e run load
```

Env: `BASE_URL`, `CLIENTS` (50), `DURATION_S` (30), `VOTE_EVERY_MS` (2000), `P95_MS` (6500),
`MAX_ERROR_RATE` (0.01). It is not part of `./ci.sh`; the manual workflow `load.yml` runs it.

## Observed (spike S5, local workerd, developer laptop)

| Clients | Votes | Ticks received | Tick p95 | Error rate |
| ------- | ----- | -------------- | -------- | ---------- |
| 100     | 1500  | 600            | 4.9 s    | 0          |
| 300     | -     | -              | 9.1 s    | 0          |

100 clients (a large meeting) stay inside one tick interval. At 300 clients the load generator and
workerd share one machine, so treat that row as an upper bound on local capacity, not a limit of
Cloudflare. Free-tier behaviour on a real account has not been measured: that needs the owner's
account (manual-steps M2) and is deliberately not automated here.

The first run of this script found a real defect: re-arming the room alarm on every vote kept
pushing the tick back, so a busy room never ticked. The room now keeps an already pending earlier
alarm (`keepsPendingAlarm`).
