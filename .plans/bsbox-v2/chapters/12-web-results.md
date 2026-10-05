---
name: "Chapter 12 — Web results"
overview: "Score ring, timeline, peak and low moments, copy and share, history."
todos:
  - id: g1
    content: "Hook test-first, then components"
    status: pending
  - id: g2
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 12 — Web results

**Repo:** `bsbox` · **Branch:** `feat/v2-web-results` · **Status:** planned
**Depends on:** [11](11-web-live.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

Everyone sees the same result when the session ends ([D3](../gaps-and-decisions.md)).

## Design decisions

- `Result/` directory: `ScoreRing.tsx` (count-up, off under reduced motion), `LevelBadge.tsx` (Highly Interactive / Healthy / Passive / Low, text + icon + colour), `Timeline.tsx` (reuses the chart), `Moments.tsx` (peak and lowest minute), `Stats.tsx` (peak participants, participation rate), `ShareActions.tsx` (copy summary, copy link).
- `ended{result}` from the socket renders immediately; otherwise `GET /api/sessions/{id}` is used (late join, reload).
- `features/series/components/History` lists past sessions from `GET /api/sessions?series=`.
- Copy summary text is localized and uses the active locale's number and date formatting.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `apps/web/src/features/session/components/Result/**` | session | New |
| `apps/web/src/features/series/components/History/**` | series | New |
| `apps/web/src/features/session/hooks/useResult.ts` | session | New |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | `ended` message renders the score as `round(score*100)%` with the matching level label in en and de |
| **Happy** | Reloading an ended session fetches the result by id and renders the same view; copy summary writes localized text to the clipboard |
| **Negative** | A result with `peak 0` shows an empty-state (no NaN, no ring), not a score |
| **Negative** | `session_expired` (410) shows the expired state; clipboard failure shows a fallback selectable text field |

## Green

1. Hook test-first, then components.
2. `./ci.sh`.

## Refactor gate

`grep -rn "toFixed\|%" apps/web/src/features/session/components/Result | grep -v i18n` shows formatting only through `Intl` helpers. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-web-results
```

Commit message: `feat(web): result screen with score, timeline and history`
