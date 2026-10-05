---
name: BSBox v2 — Manual steps
overview: "Everything the owner must do by hand, which chapter each step blocks, and how to confirm it is done. No loop agent performs these."
isProject: false
---

# BSBox v2 — Manual steps (owner only)

**Rollout:** [01-rollout.md](01-rollout.md) · **Decisions:** [gaps-and-decisions.md](gaps-and-decisions.md) (D13)

The loop never performs these. A chapter that needs one stops and reports it as its blocker. Tick a box when done.

| # | Step | Blocks | Done when |
|---|---|---|---|
| M1 | Confirm GitHub Actions is enabled for `vadim-schultz/bsbox` and `gh auth status` works on the machine running the loop | 02 | CI runs on a PR |
| M2 | Create a Cloudflare account (free plan) and enable Workers, D1 and Durable Objects | 04 (remote D1), 18 | `wrangler whoami` works |
| M3 | Create a Cloudflare API token (Workers + D1 edit) and add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub secrets | 18 | Deploy workflow authenticates |
| M4 | Register a domain and point its DNS at Cloudflare. The AppSource listing needs a stable URL | 17, 18 | `https://<domain>/api/health` returns 200 |
| M5 | Set the Worker secret `TOKEN_HMAC_KEY` (`wrangler secret put`) for each environment | 18 | Join works in staging |
| M6 | Create a Microsoft 365 developer tenant (or use a test tenant) for sideloading | 13, 14 manual checks | Sideload succeeds in Outlook web and Teams |
| M7 | Create a Partner Center account and complete publisher verification | 17 | Offer can be created |
| M8 | Write and approve the legal text: privacy policy, terms, support contact (drafts are generated in chapter 15, reviewed by you) | 17 | Text approved |
| M9 | Approve EN and DE AppSource listing text and screenshots (drafts generated in chapter 17) | 17 | Approved |
| M10 | Submit the offer in Partner Center and answer validation feedback | after 17 | Offer published |
| M11 | Manual two-account end-to-end check in Outlook (compose, send, join) and Teams (side panel); record the result in the ledger blocker column | 18 | Recorded in `run-ledger.md` |

Customer-side deployment (tenant admin uploads the app in the M365 admin center) is documented in chapter 15, not a loop task.
