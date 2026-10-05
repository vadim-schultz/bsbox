---
name: BSBox v2 — Gaps and decisions
overview: "Settled decisions D1–D14 (do not re-litigate), deferred items, and open spikes S1–S5 with fallbacks."
isProject: false
---

# BSBox v2 — Gaps and decisions

**Architecture:** [00-architecture.md](00-architecture.md) · **Rollout:** [01-rollout.md](01-rollout.md) · **Manual steps:** [manual-steps.md](manual-steps.md) · **Chapters:** [chapters/](chapters/)

---

## Settled

| # | Decision |
|---|---|
| D1 | Platform is Cloudflare: Workers, Durable Objects, D1, Static Assets, Cron. No other hosting. |
| D2 | Identity is an anonymous signed token per device. No fingerprinting, no login, no PII. |
| D3 | Everyone is equal. No organizer dashboard or roles. |
| D4 | Score is 0–1, presence-based per minute, peak-N boost, formula in [00-architecture.md](00-architecture.md) §3.1. Only `packages/shared` computes it. |
| D5 | One Durable Object per session; no pub/sub backplane. |
| D6 | Fluent UI React v9, not Chakra. Frontend follows the feature architecture in §9 of the architecture doc. |
| D7 | AppSource-ready from day one (listing, privacy, support, validation). |
| D8 | EU jurisdiction for Durable Objects; D1 location hint `weur`. |
| D9 | Retention is 30 days for results; DO data purged 24 h after finalize. |
| D10 | Exactly two languages, `en` and `de`. Key-parity test in CI. |
| D11 | API has two flat resources, `series` and `sessions`; routes fixed in chapter 05. |
| D12 | Everything about v1 is removed in chapter 01 (tag `legacy-v1` keeps history). |
| D13 | Manual owner steps live only in [manual-steps.md](manual-steps.md). Chapters never block on them silently; they stop and report. |
| D14 | Package manager is pnpm; TypeScript strict everywhere; Vitest for unit tests; Playwright for e2e. |

## Deferred

- Organizer dashboards, Entra SSO, Google Calendar, Slack, per-participant lines, AI summaries.
- A third language.
- Outlook mobile compose support beyond what the platform offers.

## Open spikes (resolved inside the named chapter; each has a fallback)

| # | Question | Chapter | Fallback |
|---|---|---|---|
| S1 | Does Outlook compose expose the Teams join URL (for dual-key linking)? | 13 | Independent series per entry point plus the QR/copy-link affordance |
| S2 | Is Smart Alerts `OnAppointmentSend` available across Outlook clients? | 13 | Manual "Sync times" button |
| S3 | Outlook mobile compose-surface limits | 13 | Organizers insert from desktop/web; mobile users join by link |
| S4 | Teams web blocks third-party storage | 14 | In-memory token plus URL-fragment fallback |
| S5 | Free-tier DO/D1 limits at 1000+ participants | 16 | Coalesced ticks; paid plan (about 5 USD/month) |

Record each spike outcome as an `**Outcome:**` note in its chapter.
