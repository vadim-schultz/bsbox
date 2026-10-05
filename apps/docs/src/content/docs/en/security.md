---
title: Security
description: Security overview.
---

- All traffic uses HTTPS and is served through Cloudflare.
- Participant tokens are signed with HMAC and expire. They contain no personal data.
- Meeting edit rights are held as a secret token in the organizer's invite, stored only as a SHA-256 hash on the server.
- Data is minimal: aggregates only, deleted after 30 days. See [Privacy](/en/privacy/).
- Report vulnerabilities through [Support](/en/support/).
