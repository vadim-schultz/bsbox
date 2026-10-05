---
name: "Chapter 11 — Web live"
overview: "Vote cards, live chart with accessible table, presence, reconnect UX and inactivity nudge."
todos:
  - id: g1
    content: "Pure utils test-first, then the hook, then components"
    status: pending
  - id: g2
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 11 — Web live

**Repo:** `bsbox` · **Branch:** `feat/v2-web-live` · **Status:** planned
**Depends on:** [10](10-web-join-lobby.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

The core experience: one-thumb voting and a calm real-time chart.

## Design decisions

- `Live/` directory: `VoteCards.tsx` (two toggle cards; active card tap sends `disengaged`; haptic via `navigator.vibrate` when available), `EngagementChart/` (custom SVG with d3-scale/d3-shape: area engaged vs. not engaged, overall line, now marker, blank future), `ChartTable.tsx` (visually hidden data table), `ReconnectBanner.tsx`, `InactivityNudge.tsx`.
- `useLiveSession(sessionId)` hook merges `welcome.timeline` with `tick` messages and exposes `{timeline, presence, myStatus, vote, connection}`; EMA smoothing is a pure util used only for the line.
- Optimistic vote with rollback on `error`. Nudge after 10 minutes without a tap, dismissible and disable-able (stored).
- Touch targets ≥ 48 px, aria labels and `aria-pressed` on cards, low-rate `aria-live` summary, `prefers-reduced-motion` respected. Status colours are colour-blind safe and always paired with icon and text.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `apps/web/src/features/session/hooks/useLiveSession.ts` | session | New |
| `apps/web/src/features/session/components/Live/**` | session | New |
| `apps/web/src/features/session/utils/{smoothing,chartData}.ts` | session | New |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | Tapping "This is interesting" sends `vote engaged`, shows it pressed immediately, and a `tick` updates the chart and the table |
| **Happy** | Tapping the active card sends `disengaged` and unpresses it |
| **Negative** | A server `error{not_live}` rolls the optimistic vote back and shows a localized message |
| **Negative** | Socket drop shows the reconnect banner, keeps the last chart, and after reconnect `hello` reuses the token; with reduced motion no spring animation class is applied |

## Green

1. Pure utils test-first, then the hook, then components.
2. `./ci.sh`.

## Refactor gate

`grep -rn "scoring\|finalScore" apps/web/src` prints nothing (the client displays, never scores). Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-web-live
```

Commit message: `feat(web): live voting, real-time chart and reconnect UX`
