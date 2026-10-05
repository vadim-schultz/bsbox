# Local demo: a scripted meeting with 18+ participants

One command spins up the worker and the web dev server, runs three concurrent meetings in real
time (about 11 minutes), opens browser windows, and prints a pass/fail report.

```bash
pnpm --filter @bsbox/e2e run demo                 # headed browsers
pnpm --filter @bsbox/e2e run demo -- --headless   # no visible windows
pnpm --filter @bsbox/e2e run demo -- --keep-running  # leave the stack up afterwards
pnpm --filter @bsbox/e2e run demo -- --reuse      # adopt a stack that is already running
```

Ports: `E2E_API_PORT` (default 8788) and `E2E_WEB_PORT` (default 5173). Logs go to `e2e/demo/.logs/`.
The run refuses non-local targets and exits non-zero when any check fails.

## What runs

- **A "Team sync"** (8 min, 18 bots plus the browser windows): warm-up, dip at minutes 3-4,
  recovery at 5-6. The server result is compared with a ground truth replayed from the persona
  scripts through `packages/shared` scoring.
- **B "Quiet standup"** (5 min, 10 bots, mostly lurkers): must score low or passive.
- **C "Ghost room"** (5 min): one socket, nobody says hello; must finalize empty (peak 0).
- Lobby-only rooms for hostile-socket checks, then a REST sweep (the 429 check runs last).

The Durable Object runs on wall-clock time (`?now=` only affects REST), hence real minutes.

## Manual checklist (headed run)

- English window: countdown, vote cards, chart, result ring, badge, moments, copy buttons.
- German window: translated UI, locale switcher.
- Reduced-motion window: the ring jumps to its value.
- Skewed-clock window: drift warning in the lobby.

## Not coverable locally

Real Outlook/Teams clients, real Cloudflare limits, the `eu` jurisdiction (local uses the plain
namespace) and Analytics Engine.
