# Engagement score

Single source of truth in code: `packages/shared/src/scoring.ts`. A test (`apps/docs/scripts/scoring-doc.test.ts`) keeps this page in sync with the constants.

## Buckets

Votes are bucketed per **1-minute** slot (`minute_idx`). Within a minute the last vote of each participant wins and is carried forward until the participant changes it. (Version 1 used coarser buckets; that is superseded.)

## Formula

For each minute `m` with at least one participant present (`P_m >= 1`), let `E_m` be the number of those whose status is `speaking` or `engaged`:

```text
r_m   = min(E_m, P_m) / P_m
raw   = mean(r_m) over minutes with P_m >= 1      (0 when there are none)
boost = 1 + ALPHA / log2(peak + 1)                (peak = peak participants, >= 1)
score = min(raw * boost, raw + CAP, 1)
```

Constants:

```text
ALPHA = 0.8
CAP = 0.25
```

The boost favours small groups, where a single person moves the ratio a lot; `CAP` bounds the uplift and the score never exceeds 1.

## Levels

```text
high >= 0.6
healthy >= 0.4
passive >= 0.2
low < 0.2
```

All values are fractions in 0..1; the UI shows percentages.
