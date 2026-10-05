---
name: "Chapter 10 — Web join and lobby"
overview: "Series lookup, lobby with countdown, clock-drift warning, error and expired states."
todos:
  - id: g1
    content: "Hook and container test-first, then components"
    status: pending
  - id: g2
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 10 — Web join and lobby

**Repo:** `bsbox` · **Branch:** `feat/v2-web-lobby` · **Status:** planned
**Depends on:** [9](09-web-foundation.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

`/m/CODE` resolves silently and shows the right state ([architecture §10](../00-architecture.md)).

## Design decisions

- `features/series/services/seriesApi.ts` + `useSeries(code)` hook; `features/session/containers/SessionContainer` chooses view by state: `scheduled → Lobby`, `live → Live` (placeholder until ch. 11), `ended → Result` (placeholder until ch. 12).
- `Lobby` component directory: `Lobby/{index.ts, Countdown.tsx, DriftWarning.tsx, PresenceCount.tsx}`. Countdown uses `serverTime` offset, not the device clock.
- Drift warning when |client − server| > 5 s. States: loading skeleton, `series_not_found`, `session_expired`, network error with retry. All copy via catalogues (en + de).
- Connects the socket in lobby so presence is visible; `phase live` switches the view without reload.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `apps/web/src/features/series/{services,hooks,types}/**` | series | New |
| `apps/web/src/features/session/containers/SessionContainer.tsx` | session | New |
| `apps/web/src/features/session/components/Lobby/**` | session | New |
| `apps/web/src/features/shell/components/ErrorState.tsx` | shell | New |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | Scheduled series renders title and a countdown computed from `serverTime`; receiving `phase live` switches to the live placeholder |
| **Happy** | A skewed device clock (+30 s) shows the drift warning; the countdown still matches the server |
| **Negative** | Unknown code shows the localized not-found state with no retry loop; expired shows the expired state |
| **Negative** | Network failure shows an error with a retry button that refetches; the component never imports a service (container passes props) |

## Green

1. Hook and container test-first, then components.
2. `./ci.sh`.

## Refactor gate

`grep -rn "seriesApi\|lib/ws" apps/web/src/features/session/components` prints nothing. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-web-lobby
```

Commit message: `feat(web): join flow, lobby countdown and error states`
