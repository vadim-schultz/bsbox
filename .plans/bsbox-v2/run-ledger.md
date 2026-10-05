# Run ledger

**Loop branch:** `feat/plans-bsbox-v2`
**Release branch:** `main`
**Release MR/PR:** _(filled when opened)_

Chapter MRs merge into the loop branch only. The chapter-implementer **does not** edit this file.

| chapter | branch | mr/pr | local ci | remote ci | merged | blocker |
| --- | --- | --- | --- | --- | --- | --- |
| 01 legacy-cleanup | feat/v2-legacy-cleanup | https://github.com/vadim-schultz/bsbox/pull/2 | pass | pass | merged | none |
| 02 scaffold-ci | feat/v2-scaffold | https://github.com/vadim-schultz/bsbox/pull/3 | pass | pass | merged | none |
| 03 shared-domain | feat/v2-shared | https://github.com/vadim-schultz/bsbox/pull/4 | pass | pass | merged | none |
| 04 d1-schema | feat/v2-d1 | https://github.com/vadim-schultz/bsbox/pull/5 | pass | pass | merged | none |
| 05 series-api | feat/v2-series-api | https://github.com/vadim-schultz/bsbox/pull/6 | pass | pass | merged | none |
| 06 session-do-core | feat/v2-do-core | https://github.com/vadim-schultz/bsbox/pull/7 | pass | pass | merged | none |
| 07 session-lifecycle | feat/v2-do-lifecycle | https://github.com/vadim-schultz/bsbox/pull/8 | pass | pass | merged | none |
| 08 results-api | feat/v2-results-api | https://github.com/vadim-schultz/bsbox/pull/9 | pass | pass | merged | none |
| 09 web-foundation | feat/v2-web-foundation | https://github.com/vadim-schultz/bsbox/pull/10 | pass | pass (verified post-merge by chief; PR run and loop-branch push run both green) | merged | none |
| 10 web-join-lobby | feat/v2-web-lobby | https://github.com/vadim-schultz/bsbox/pull/11 | pass | pass | merged | none |
| 11 web-live | feat/v2-web-live | https://github.com/vadim-schultz/bsbox/pull/12 | pass | pass | merged | none |
| 12 web-results | feat/v2-web-results | https://github.com/vadim-schultz/bsbox/pull/13 | pass | pass | merged | none |
| 13 outlook-addin | feat/v2-outlook | https://github.com/vadim-schultz/bsbox/pull/14 | pass | pass | merged | none (manual pending: M6 sideload check; placeholder domain pending M4) |
| 14 teams-app | feat/v2-teams | https://github.com/vadim-schultz/bsbox/pull/15 | pass | pass | merged | none (manual pending: M6 Teams sideload; M4 placeholder domain) |
| 15 docs-site | feat/v2-docs | https://github.com/vadim-schultz/bsbox/pull/16 | pass | pass | merged | none (manual pending: M8 legal review; placeholders for contact/jurisdiction) |
| 16 e2e-and-load | feat/v2-e2e | https://github.com/vadim-schultz/bsbox/pull/17 | pass | pass (ci + e2e jobs) | merged | none (S5 free-tier load unmeasured; needs M2) |
| 17 appsource-compliance | feat/v2-appsource | https://github.com/vadim-schultz/bsbox/pull/18 | pass (1 flaky web test on first run, rerun green) | pass (ci + e2e) | merged | none (manual pending: M4, M7-M10; _headers frame-ancestors layer to confirm in ch18) |
| 18 deploy-release | feat/v2-deploy | https://github.com/vadim-schultz/bsbox/pull/19 | pass | pass (ci + e2e) | merged | none (manual pending: M2-M5, M11, real D1 ids/routes, GH secrets/vars) |
