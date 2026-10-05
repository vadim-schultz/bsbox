---
name: "Chapter 13 — Outlook add-in"
overview: "Unified manifest, compose and read taskpanes, link insertion, custom properties and time sync."
todos:
  - id: g1
    content: "Service and utils test-first, then containers"
    status: pending
  - id: g2
    content: "Manifest and validation script"
    status: pending
  - id: g3
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 13 — Outlook add-in

**Repo:** `bsbox` · **Branch:** `feat/v2-outlook` · **Status:** planned
**Depends on:** [12](12-web-results.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

An organizer adds BSBox to an invite in one click and attendees open results ([architecture §8](../00-architecture.md)).

## Design decisions

- `packages/addin/manifest.json` (unified Microsoft 365 manifest) with Outlook compose-appointment command "Add BSBox", read-appointment command "Open results", localized names/descriptions/labels (en, de) via `localizationInfo`. Validated by `office-addin-manifest` in `ci.sh`.
- `features/host/` containers: `ComposePane` (state machine Not added → Adding → Added → Error) and `ReadPane`. Office.js is used only in `features/host/services/officeApi.ts`.
- Create flow: read `subject/start/end/recurrence` → `POST /api/series` (with Teams join URL as `externalKey` if exposed, spike S1) → insert HTML block + plain-text fallback via `body.setSelectedDataAsync`, in the organizer's language → store `{code, editToken}` in item custom properties.
- Reopen flow: load custom properties, show link/copy, "Sync times" calls `PATCH`. `OnAppointmentSend` handler re-syncs where supported (S2).
- Spikes S1–S3: implement the probing code, record **Outcome:** here with the chosen fallbacks.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `packages/addin/manifest.json`, `icons/*`, `scripts/validate.ts` | addin | New |
| `apps/web/src/features/host/{containers,components,services,hooks}/**` | host | New |
| `apps/web/src/features/host/utils/inviteBlock.ts` (en + de HTML/text) | host | New |

## Manual configuration

M6 for the manual sideload check (record in the ledger blocker column) — see [manual-steps.md](../manual-steps.md). The implementer stops and reports if a manual step blocks a check; it never performs one.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | With a fake `Office.context.mailbox.item`, "Add BSBox" calls `POST /api/series` once and inserts a block containing the join URL; custom properties get code and token |
| **Happy** | Reopening with stored properties shows the link; "Sync times" issues a `PATCH` with `X-Edit-Token` |
| **Negative** | API failure leaves the invite body untouched and shows a localized error with retry; double-click does not create two series (idempotent via guard) |
| **Negative** | Missing custom properties in read mode shows "no BSBox session"; the manifest validator fails on a missing German label |

## Green

1. Service and utils test-first, then containers.
2. Manifest and validation script.
3. `./ci.sh`.

## Refactor gate

`grep -rn "Office\." apps/web/src | grep -v features/host/services` prints nothing. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-outlook
```

Commit message: `feat(addin): Outlook compose and read add-in with invite link insertion`
