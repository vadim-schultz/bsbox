---
name: BSBox v2 — Architecture
overview: "Why BSBox is rebuilt from scratch as a Cloudflare-hosted Outlook and Teams add-in; services, monorepo layout, data model, API, WebSocket protocol, scoring, frontend structure, UX, i18n and docs. v1 is fully superseded."
isProject: false
---

# BSBox v2 — Architecture

**Rollout:** [01-rollout.md](01-rollout.md) · **Decisions:** [gaps-and-decisions.md](gaps-and-decisions.md) · **Manual steps:** [manual-steps.md](manual-steps.md) · **Chapters:** [chapters/](chapters/)

---

## 1. Why

BSBox lets meeting participants tap their engagement on their phones, shows a real-time chart, and gives a score at the end. The Raspberry Pi captive portal and the internal-server stack both failed on the network (registry mirrors, proxies, nginx/WebSocket routing). v2 removes the deployment problem and adds a distribution channel:

- Runs entirely on free public serverless services (Cloudflare). No servers, no Docker, no proxy.
- An organizer inserts a BSBox link into an Outlook invite, or participants open a Teams meeting side panel. Participants join through the link (a magic link) with no login.
- Shipped as a complete, polished app to Microsoft AppSource.
- v1 (Litestar, React/Chakra, Postgres, Docker) is **completely superseded**. Chapter 01 removes it.

## 2. Non-goals

- No organizer dashboard, no roles. Everyone is equal and sees the same chart and score.
- No login, no Entra SSO, no PII. Participants are anonymous per-device tokens.
- No languages other than English and German.
- No Google Calendar, Slack, per-participant lines, AI summaries.
- No servers, containers or self-hosting.

## 3. Product behaviour

- A **series** is created when the Outlook add-in inserts a link, or when a Teams panel resolves a meeting. It has a stable code and URL (`/m/CODE`). A **session** is one occurrence of a series, with a start and an end.
- Participant states: `speaking`, `engaged`, `disengaged`. The UI has two toggle cards ("I'm speaking", "This is interesting"); tapping an active card clears it (`disengaged`).
- Chart: x-axis is the whole meeting window; area shows engaged vs. not engaged; a line shows the overall ratio; a "now" marker; future minutes stay blank.
- Score and level are shown to everyone when the session ends and stay available at the link for 30 days.

### 3.1 Scoring — single source of truth: `packages/shared/src/scoring.ts`

```
per minute m:  P_m = participants present (socket connected, or heartbeat < 60 s)
               E_m = of those, status in {speaking, engaged}   (last vote carried forward)
               r_m = E_m / P_m                                  (skip minute if P_m = 0)
raw   = mean(r_m over minutes with P_m > 0)                     0..1
N     = peak concurrent participants
boost = 1 + 0.8 / log2(N + 1)
score = min(raw * boost, raw + 0.25, 1)
level = score >= .60 high | >= .40 healthy | >= .20 passive | else low
```

- Everything is 0–1. v1 mixed 0–100 values into a formula capped at 1.0 and showed mid scores as "high / 100%". A test must make that bug impossible.
- A participant who joined but never voted counts as not engaged. The result also reports **participation rate** (share who voted at least once).
- Display smoothing (EMA) is client-side only and never affects the score.
- The same function serves live ticks and the final result.

## 4. Services

| Concern | Service |
|---|---|
| HTTP API | Cloudflare Workers + Hono + Zod |
| Per-session realtime | Durable Object per session, WebSocket Hibernation API, SQLite storage |
| Start/tick/finalize timing | DO `alarm()` |
| Registry and results | D1 + Drizzle ORM |
| SPA and docs hosting | Workers Static Assets |
| Retention | Cron Trigger (daily, 30 days) |
| Abuse control | Workers Rate Limiting binding |
| Residency | DO jurisdiction `eu`, D1 location hint `weur` |
| Observability | Workers Logs, Analytics Engine |
| CI/CD | GitHub Actions + `wrangler deploy` |
| Add-in packaging | Unified Microsoft 365 manifest (`manifest.json`), validated with `teamsapp` and `office-addin-manifest` |
| Docs site | Astro Starlight |

```
Outlook (Win/Mac/Web/new) ──taskpane──┐
Teams meeting side panel ─────────────┼── React SPA (Fluent UI) ──HTTPS/WSS──► Worker (Hono)
Participant browser/phone (/m/CODE) ──┘                                         │        │
                                                                         D1 (series,   Durable Object
                                                                          sessions,    SessionRoom
                                                                          timelines)   (SQLite: participants,
                                                                                        votes; alarms; WS hub)
```

## 5. Monorepo layout (pnpm workspaces)

```text
apps/worker      Hono API, SessionRoom DO, cron, D1 migrations (Drizzle)
apps/web         React + Vite SPA: join / live / results / taskpane / teams panel
apps/docs        Astro Starlight (en + de)
packages/shared  Zod schemas, WS protocol types, scoring, slot/RRULE utils, code generator, token HMAC
packages/addin   unified manifest, icons, build + validation scripts
e2e/             Playwright
ci.sh            lint, format:check, typecheck, vitest --run, build, manifest validate
```

Dependency direction: `apps/*` and `packages/addin` may import `packages/shared`. `packages/shared` imports nothing from the apps. `apps/web` never imports `apps/worker`.

## 6. Data model

### 6.1 D1 (global, durable)

```text
series(
  code TEXT PK,                  -- 10-char Crockford base32, ~50 bits
  title TEXT NULL,
  source TEXT CHECK IN ('outlook','teams','web'),
  external_key TEXT NULL UNIQUE, -- e.g. 'teams:<hash of joinUrl|threadId>'
  tz TEXT NOT NULL,              -- IANA
  start_utc INTEGER NOT NULL,    -- first occurrence, epoch s
  duration_min INTEGER NOT NULL CHECK BETWEEN 5 AND 480,
  rrule TEXT NULL,               -- RFC 5545, evaluated with the `rrule` lib
  edit_token_hash TEXT NOT NULL, -- sha256; token held by the add-in in item custom properties
  created_at INTEGER, expires_at INTEGER)
sessions(
  id TEXT PK,                    -- '<code>-<start_epoch>'
  series_code TEXT FK -> series ON DELETE CASCADE,
  start_ts INTEGER, end_ts INTEGER,
  state TEXT CHECK IN ('scheduled','live','ended'),
  peak_participants INTEGER NULL, participation_rate REAL NULL,
  raw REAL NULL, score REAL NULL, level TEXT NULL, finalized_at INTEGER NULL,
  INDEX(series_code, start_ts))
session_minutes(                 -- written at finalize; powers the results chart after DO purge
  session_id TEXT FK, minute_idx INTEGER, present INTEGER, engaged INTEGER,
  PRIMARY KEY(session_id, minute_idx))
```

### 6.2 Durable Object SQLite (per session, hot path)

```text
participants(id TEXT PK, joined_at INTEGER, last_seen_at INTEGER, left_at INTEGER NULL,
             last_status TEXT, voted INTEGER DEFAULT 0)
votes(participant_id TEXT, minute_idx INTEGER, status TEXT,
      PRIMARY KEY(participant_id, minute_idx))     -- last tap in a minute wins
meta(key TEXT PK, value TEXT)                       -- session id, start/end, phase
```

- Participant token: `base64url(pid.sessionId.exp).HMAC`, kept in `localStorage` (fallbacks: in-memory and URL fragment when third-party storage is blocked, e.g. Teams web). No PII.
- The DO is purged 24 h after finalize. D1 keeps only aggregates; the daily cron deletes rows older than 30 days.

## 7. API

Our own API; no Microsoft standard applies. Exactly two resources, `series` and `sessions`, one name each, flat routes (no nesting), relations as query filters. `/m/CODE` is a UI route, not API. Routes are fixed in chapter 05.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/series` | Create `{title?, start, durationMin, tz, rrule?, source, externalKey?}`. `201 {code, joinUrl, editToken}`. Existing `externalKey` returns `200` with the existing series (no token) |
| GET | `/api/series/{code}` | Series plus current or next session: `{code, title, schedule, session: {id, state, start, end}, serverTime}` |
| PATCH | `/api/series/{code}` | Re-sync times/RRULE. Requires `X-Edit-Token` |
| GET | `/api/sessions?series={code}` | History, newest first, cursor-paginated |
| GET | `/api/sessions/{id}` | `{id, series, state, start, end}` plus `result` once ended: `{score, level, raw, peak, participationRate, minutes[]}` |
| GET | `/api/sessions/{id}/ws` | WebSocket upgrade, forwarded to the session DO |
| GET | `/api/health` | Liveness |

Errors use RFC 9457 problem+json with stable `code` values (the client translates them; no server-side language).

WebSocket messages (`packages/shared`, Zod-validated both directions):

```text
C→S  hello{token?}  vote{status: speaking|engaged|disengaged}  ping
S→C  welcome{participantId, token, session, timeline[]}
     tick{minuteIdx, present, engaged, speaking}   -- coalesced, at most every 5 s
     phase{state: scheduled|live|ended, at}
     ended{result}                                 -- result embedded (atomic)
     error{code}                                   -- bad_token | rate_limited | not_found
```

Rules: votes outside the window are rejected; the server clock is authoritative (client warns on drift > 5 s); reconnect with exponential backoff and jitter re-sends `hello` with the token; a missed `ended` is recoverable via `GET /api/sessions/{id}`.

## 8. Outlook and Teams integration

**Outlook add-in** (appointment organizer, compose):
- Ribbon button "Add BSBox" opens a taskpane. It reads `item.start/end/subject/recurrence` via `getAsync` and calls `POST /api/series`.
- Inserts a styled link block with `body.setSelectedDataAsync(html, {coercionType: html})` plus a plain-text fallback line, written in the organizer's language.
- Stores `{code, editToken}` in the item custom properties (`loadCustomPropertiesAsync`) so reopening the pane re-syncs.
- "Sync times" button, plus a Smart Alerts `OnAppointmentSend` handler where supported.
- Read surface: "Open results" taskpane with the series history.

**Teams app** (same unified manifest):
- `meetingSidePanel` configurable tab that renders the same SPA with `?host=teams`.
- Calls `meeting.getMeetingDetails()` (id, times, join URL), then idempotent `POST /api/series` with `externalKey`.
- "Copy link / QR" lets others join on a phone. Teams theme (default, dark, contrast) maps to Fluent themes.
- `frame-ancestors` is limited to Teams and Outlook hosts.

Linking: Outlook sends the Teams join URL as `externalKey` when the item exposes it (spike S1), so both entry points resolve to the same series.

## 9. Frontend structure (`apps/web`)

Fluent UI v9 defines no app folder convention (only `FluentProvider` theming and Griffel `makeStyles`). The app follows the eggs/rsb **feature architecture**:

```text
apps/web/src/
  main.tsx
  app/            route table, FluentProvider + locale/theme wiring
  components/     cross-feature UI (ScoreRing, Toaster, LocaleSwitcher)
  theme/          Fluent theme tokens (light, dark, high contrast), Teams theme mapping
  i18n/           strings.en.ts, strings.de.ts, locale resolution, parity test
  lib/            env, http client, ws client (no domain types)
  test/           setup
  features/
    session/      join, lobby, live, results   (containers/ components/ hooks/ services/ types/ utils/)
    series/       series lookup/creation, history
    host/         Outlook taskpane and Teams panel containers (Office.js / teams-js only behind services/)
    shell/        layout, error boundaries, offline banner
```

Layer rules (enforced as written by implementers):

| Layer | Responsibility |
|---|---|
| Container | Owns data hooks, orchestration, URL/host state; passes plain props down |
| Component | Presentational; never imports a service |
| Hook | Reusable stateful logic; data hooks never live inside `.tsx` component bodies |
| Service | The only I/O boundary: REST, WebSocket, Office.js, teams-js |
| Types / utils | Domain types and pure functions |

A component with named sub-components becomes a directory with an `index.ts` barrel, each sub-component in its own file. Leaf components stay single files. Griffel `makeStyles` is co-located with its component. Tests sit beside components.

Chart: custom SVG with d3-scale and d3-shape, plus a visually hidden data table as the accessible alternative. Recharts is not used.

## 10. UX

Principles: smartphone-first, one-thumb voting, no sign-up, calm and low-distraction in meetings.

| Screen | Content |
|---|---|
| Landing `/` | One-line pitch, "Add to Outlook / Teams", how it works, privacy note |
| Join `/m/CODE` | Resolves silently, then shows lobby, live or result by state |
| Lobby | Title, countdown to start, clock-drift warning, presence count |
| Live | Two large toggle cards with haptic feedback; live chart; presence count; quiet nudge after 10 minutes without a tap (can be turned off) |
| Result | Score ring, level label (Highly Interactive / Healthy / Passive / Low), timeline with peak and low moments, peak participants, participation rate, "Copy summary", "Share link" |
| Expired / not found / reconnecting | Plain-language states with retry |
| Taskpane (compose) | Not added → Adding → Added (link, copy, Sync times, Remove) → Error |
| Taskpane (read) | Past sessions of the series, link to results |
| Teams side panel | Compact Live with share affordance |

Cross-cutting:
- **Tokens:** Fluent v9 themes (light, dark, high contrast). Status colours are colour-blind safe, always paired with icon and text.
- **Accessibility:** WCAG 2.2 AA; aria labels on all controls; low-rate `aria-live` tick announcements; chart data table; touch targets ≥ 48 px; `prefers-reduced-motion` honoured.
- **Motion:** subtle toggle spring and score count-up, both off under reduced motion.

## 11. i18n — exactly English (`en`) and German (`de`)

- One typed catalogue per language. `en` defines the keys; `de` must satisfy the same type, so a missing key fails typecheck. No user-facing copy outside the catalogues.
- A test asserts key parity and matching placeholders and fails CI otherwise.
- Locale resolution: stored user choice (switcher on every screen) → Office `displayLanguage` / Teams `app.getContext().app.locale` → `navigator.language` → `en`. Dates, times and numbers use `Intl` with the active locale.
- Covered surfaces: SPA, taskpanes, Teams panel, the text inserted into the invite, problem+json `code` translation, docs site (Starlight i18n `/en` `/de`), manifest (`localizationInfo`), AppSource listing.

## 12. Documentation deliverables (`apps/docs`, EN + DE)

User guide (add BSBox, join, understand your score); install and admin guide (M365 admin center, Teams custom app upload); privacy policy, terms, support, security overview; `docs/operations/runbook.md`; `docs/scoring.md`; developer README.

## 13. Traceability from v1

| v1 finding | v2 answer |
|---|---|
| Score formula capped a 0–100 value at 1.0 | One 0–1 pure function, boundary tests |
| Live deltas vs. Kalman snapshots differed | One scoring function for live and final; Kalman dropped |
| Late joiners counted as 0; "max participants" was total rows | Presence per minute; peak concurrency |
| FingerprintJS identity | Signed random token |
| In-memory channels, single process | Durable Object per session |
| README claimed 15-minute buckets (real: 1 minute) | 1-minute buckets documented in `docs/scoring.md` |
| No recurring meetings | Series and sessions with RRULE |
