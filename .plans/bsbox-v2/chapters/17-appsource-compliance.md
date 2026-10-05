---
name: "Chapter 17 — AppSource compliance"
overview: "Icons, EN and DE listing copy and screenshots, localized manifest strings, validation, security headers and accessibility audit."
todos:
  - id: g1
    content: "Headers middleware test-first"
    status: pending
  - id: g2
    content: "Validation rules"
    status: pending
  - id: g3
    content: "Listing assets"
    status: pending
  - id: g4
    content: "`./ci.sh`"
    status: pending
isProject: false
---

# Chapter 17 — AppSource compliance

**Repo:** `bsbox` · **Branch:** `feat/v2-appsource` · **Status:** planned
**Depends on:** [16](16-e2e-and-load.md) · **Architecture:** [../00-architecture.md](../00-architecture.md) · **Rollout:** [../01-rollout.md](../01-rollout.md)

## Goal

Everything needed to submit to AppSource, except what only the owner can do ([manual-steps.md](../manual-steps.md)).

## Design decisions

- Icons (32/80 px Outlook, 192 color and 32 outline Teams) and listing assets in `packages/addin/listing/{en,de}/` (title, short and long description, screenshots generated from Playwright runs).
- Security headers on all responses: strict CSP (self + required Microsoft script origins for Office.js and teams-js), `frame-ancestors` for Outlook/Teams hosts only on host routes and `none` elsewhere, HSTS, `X-Content-Type-Options`, `Referrer-Policy`.
- Manifest validation passes with the `teamsapp validate` and `office-addin-manifest validate` rule sets; domains in `validDomains` contain no wildcards.
- Accessibility audit notes recorded in `docs/operations/accessibility.md` (WCAG 2.2 AA checklist results).
- Privacy/support/terms URLs in the manifest point at the docs site pages.

## Files

| Path | Layer | Change |
| --- | --- | --- |
| `packages/addin/listing/**`, `icons/*` | addin | New |
| `apps/worker/src/middleware/securityHeaders.ts` (+ test) | worker | New |
| `packages/addin/scripts/validate.ts` | addin | Edit |
| `docs/operations/accessibility.md` | docs | New |

## Manual configuration

M7, M9 (Partner Center, listing approval); submission M10 is owner-only — see [manual-steps.md](../manual-steps.md). The implementer stops and reports if a manual step blocks a check; it never performs one.

## Red tests

| Kind | Asserts |
| --- | --- |
| **Happy** | Every response carries the expected headers; host routes allow framing only from Outlook/Teams origins |
| **Happy** | Validation script passes on the manifest and fails the build if a listing field is missing in either language |
| **Negative** | A wildcard in `validDomains` fails validation |
| **Negative** | A page outside the host routes responds with `frame-ancestors 'none'`; a CSP report for an inline script is not possible (test asserts no `unsafe-inline`) |

## Green

1. Headers middleware test-first.
2. Validation rules.
3. Listing assets.
4. `./ci.sh`.

## Refactor gate

`grep -rn "unsafe-inline\|unsafe-eval" apps packages` prints nothing. Report outcome.

## Git workflow

```bash
git checkout feat/plans-bsbox-v2 && git pull
git checkout -b feat/v2-appsource
```

Commit message: `feat: AppSource listing assets, security headers and validation`
