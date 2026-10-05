# CLAUDE.md

Guidance for Claude Code in this repository. The authoritative design is
`.plans/bsbox-v2/00-architecture.md`; decisions are in `.plans/bsbox-v2/gaps-and-decisions.md`.

## Project

BSBox v2: real-time meeting engagement tracking, hosted on Cloudflare (Workers, Hono,
Durable Objects, D1), delivered as an Outlook and Teams add-in. React + Vite SPA with
Fluent UI v9. pnpm workspaces, TypeScript strict, Vitest, Playwright.

## Commands

```bash
pnpm install
./ci.sh          # lint, format:check, typecheck, vitest --run, build, manifest validate
```

Until chapter 02 adds workspaces, `./ci.sh` only runs the legacy-removal checks.

## Layout

`apps/worker`, `apps/web`, `apps/docs`, `packages/shared`, `packages/addin`, `e2e/`.
`apps/*` and `packages/addin` may import `packages/shared`; `packages/shared` imports nothing
from the apps; `apps/web` never imports `apps/worker`. Only `packages/shared` computes scores.

## Frontend layer rules (apps/web, feature architecture)

- Container: owns data hooks, orchestration, URL/host state; passes plain props down.
- Component: presentational; never imports a service.
- Hook: reusable stateful logic; data hooks never live inside `.tsx` component bodies.
- Service: the only I/O boundary (REST, WebSocket, Office.js, teams-js).
- Types / utils: domain types and pure functions.
- Tests sit beside components; Griffel `makeStyles` is co-located with its component.

## Languages

Exactly English (`en`) and German (`de`). No user-facing copy outside the typed catalogues;
a parity test must pass in CI.
