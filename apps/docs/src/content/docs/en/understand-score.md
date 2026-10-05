---
title: Understand your score
description: How the engagement score is computed.
---

The score is a number from 0 to 100 percent with a level: high, healthy, passive or low.

- The meeting is divided into 1-minute buckets.
- For each minute with at least one participant, BSBox computes the share of participants who were engaged.
- The raw score is the mean of these shares.
- A small boost helps small groups, and is capped so it never exceeds the raw score by more than 25 percentage points.

The exact formula and thresholds are in the repository file `docs/scoring.md`. Questions? See [Support](/en/support/).
