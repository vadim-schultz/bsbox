---
name: "Chapter 14 — Teams app"
overview: "Meeting side panel, idempotent series by `externalKey`, theme mapping and storage fallbacks."
todos:
  - id: g1
    content: "Service and mapper test-first, then container"
    status: pending
  - id: g2
    content: "Manifest edit and validation"
    status: pending
  - id: g3
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 14 — Teams app

**Repo:** `bsbox` · **Branch:** `feat/v2-teams` · **Status:** planned
**Depends on:** [13](13-outlook-addin.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

Participants vote inside Teams without leaving the call ([architecture §8](../00-architecture.md)).

## Design decisions

- Add a `meetingSidePanel` configurable tab to the unified manifest, localized en/de; `frame-ancestors` for Teams hosts only.
- `features/host/containers/TeamsPanel`: `teams-js` only inside `features/host/services/teamsApi.ts`; `getMeetingDetails()` → `POST /api/series` with `externalKey = teams:<hash>` → renders the compact Live view and a "Copy link / QR" share affordance.
- Theme mapper: Teams default/dark/contrast → Fluent light/dark/high-contrast. Locale from Teams context feeds `resolveLocale`.
- Spike S4: token storage order `localStorage` → in-memory + URL fragment when storage is blocked. Record **Outcome:**.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `packages/addin/manifest.json` | addin | Edit |
| `apps/web/src/features/host/containers/TeamsPanel.tsx`, `services/teamsApi.ts` | host | New |
| `apps/web/src/theme/teamsTheme.ts` (+ test) | theme | Edit |
| `apps/web/src/features/session/services/tokenStore.ts` | session | New |

## Manual configuration

M6 for the manual Teams sideload check — see [manual-steps.md](../manual-steps.md). The implementer stops and reports if a manual step blocks a check; it never performs one.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | With a fake teams-js context the panel creates (or finds) the series via `externalKey` and shows the live view; theme `dark` maps to the Fluent dark theme |
| **Happy** | QR/copy-link renders the `/m/CODE` URL |
| **Negative** | `localStorage` throwing falls back to in-memory plus fragment and the vote still works; the same `externalKey` twice yields the same series |
| **Negative** | Outside Teams (`?host=teams` without a teams-js context) shows a localized "open inside Teams" notice instead of crashing |

## Green

1. Service and mapper test-first, then container.
2. Manifest edit and validation.
3. `./ci.sh`.

## Refactor gate

`grep -rn "microsoftTeams\|@microsoft/teams-js" apps/web/src | grep -v features/host/services` prints nothing. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-teams
```

Commit message: `feat(addin): Teams meeting side panel`
