# Plans

Design and implementation plans for `bsbox`. One folder per body of work; plans stay in the repo so they
version alongside the code they describe. Structure and conventions follow the `eggs` project
(`../../eggs/.plans/README.md`): YAML frontmatter (`name`, `overview`, `isProject: false`; chapters add
`todos`), relative links, a `**Status:**` meta line, and `./ci.sh` as the gate.

## Folders

### [bsbox-v2/](bsbox-v2/) — Outlook and Teams engagement add-in

A from-scratch rebuild that completely supersedes v1. Participants join through a magic link inserted
into an Outlook invite (or a Teams meeting side panel), vote their engagement, watch a real-time chart,
and get a score. Cloudflare Workers + Durable Objects + D1, React + Fluent UI, English and German,
shipped to Microsoft AppSource. Eighteen chapters.

| Doc | What it is |
| --- | --- |
| [00-architecture.md](bsbox-v2/00-architecture.md) | Services, monorepo, data model, API, scoring, frontend structure, UX, i18n |
| [01-rollout.md](bsbox-v2/01-rollout.md) | Eighteen chapters, invariants, dependency graph, execution order |
| [gaps-and-decisions.md](bsbox-v2/gaps-and-decisions.md) | Settled decisions, deferred items, spikes |
| [manual-steps.md](bsbox-v2/manual-steps.md) | Owner-only steps (accounts, domain, Partner Center) and what they block |
| [chapters/](bsbox-v2/chapters/) | One executable plan per chapter |

Status: planned — plans not yet merged to `main`; loop branch `feat/plans-bsbox-v2`.
