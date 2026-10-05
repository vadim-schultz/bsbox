---
name: "Chapter 9 — Web foundation"
overview: "Vite SPA with Fluent themes, router, REST/WS clients, hooks and English/German i18n."
todos:
  - id: g1
    content: "Theme and provider"
    status: pending
  - id: g2
    content: "i18n catalogues + parity test"
    status: pending
  - id: g3
    content: "http/ws libs"
    status: pending
  - id: g4
    content: "Router shell"
    status: pending
  - id: g5
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 9 — Web foundation

**Repo:** `bsbox` · **Branch:** `feat/v2-web-foundation` · **Status:** planned
**Depends on:** [8](08-results-api.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

The shell every screen builds on, following the feature architecture in [architecture §9](../00-architecture.md) ([D6](../gaps-and-decisions.md), [D10](../gaps-and-decisions.md)).

## Design decisions

- Tree exactly as in architecture §9: `app/`, `components/`, `theme/`, `i18n/`, `lib/`, `test/`, `features/{session,series,host,shell}/{containers,components,hooks,services,types,utils}`.
- `theme/`: Fluent v9 light, dark and high-contrast themes; `FluentProvider` in `app/`; a Teams-theme mapper stub.
- `i18n/`: `strings.en.ts` defines the keys; `strings.de.ts` is typed `typeof en` so a missing key fails typecheck; `resolveLocale()` per [architecture §11](../00-architecture.md); `LocaleSwitcher` component; `Intl` formatters.
- `lib/http.ts` (typed fetch that parses problem+json into `ApiError(code)`), `lib/ws.ts` (typed socket with reconnect, exponential backoff + jitter, Zod-validated messages).
- Routes: `/` (landing placeholder), `/m/:code` (placeholder), `*` (not found). Vite dev proxy `/api` → `wrangler dev`; no hard-coded hosts.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `apps/web/src/{app,theme,i18n,lib,components,test}/**` | web | New |
| `apps/web/src/features/**` (folders + barrels) | web | New |
| `apps/web/vite.config.ts`, `index.html` | web | New |

## Manual configuration

None.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | `resolveLocale` returns the stored choice first, then Office/Teams locale, then `navigator.language`, then `en`; German `Intl` date formatting differs from English in a test |
| **Happy** | `http.ts` returns parsed JSON on 200 and `ws.ts` delivers a Zod-valid message to its handler |
| **Negative** | i18n parity test: a key present in `en` but not `de` (or differing `{placeholders}`) fails the test |
| **Negative** | `http.ts` turns a 404 problem+json into `ApiError` with the server `code`; `ws.ts` drops an invalid frame and reconnects with growing delay and jitter after close |

## Green

1. Theme and provider.
2. i18n catalogues + parity test.
3. http/ws libs.
4. Router shell.
5. `./ci.sh`.

## Refactor gate

`grep -rn "fetch(\|new WebSocket" apps/web/src | grep -v lib/` prints nothing; `grep -rln "from '@fluentui" apps/web/src` shows no Chakra anywhere. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-web-foundation
```

Commit message: `feat(web): Fluent shell, router, i18n (en, de) and typed clients`
