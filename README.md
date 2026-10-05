# BSBox

BSBox v2 lets meeting participants tap their engagement on their phones, shows a
real-time chart, and gives a score at the end. It runs on Cloudflare and ships as an
Outlook and Teams add-in. Participants join through a link, with no login.

Plans, architecture and decisions: [`.plans/bsbox-v2/`](.plans/bsbox-v2/).

v1 is superseded; see tag `legacy-v1`.

## Developer

```bash
pnpm install
./ci.sh                              # full local gate
pnpm --filter @bsbox/docs dev        # docs site (en, de) on localhost:4321
```

- Docs site: `apps/docs` (Astro Starlight). The build fails when an EN page has no DE counterpart, or the reverse, or when an internal link is broken.
- Scoring: [`docs/scoring.md`](docs/scoring.md). Operations: [`docs/operations/runbook.md`](docs/operations/runbook.md).
- Legal pages are drafts pending owner review.
