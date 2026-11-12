# E1 technical comparison — summary

Model: gpt-5.4-mini-2026-03-17 · replies: 270 · tutors: ModelaU, ModelaU v1 (before the fix), Baseline, Strict baseline, No-corrections baseline · prompts with all tutors: 18/18

## Paired comparison, ModelaU vs each baseline (mean over runs, per prompt)

| Metric | Baseline | ModelaU median | Baseline median | Wilcoxon W+ | n | p (exact, two-sided) |
|---|---|---|---|---|---|---|
| Words per reply | Baseline | 54.2 | 269.3 | 0.0 | 18 | <0.001 |
| Words per reply | Strict baseline | 54.2 | 307.0 | 0.0 | 18 | <0.001 |
| Words per reply | No-corrections baseline | 54.2 | 272.7 | 0.0 | 18 | <0.001 |
| Issues raised (automatic proxy) | Baseline | 1.0 | 22.5 | 0.0 | 18 | <0.001 |
| Issues raised (automatic proxy) | Strict baseline | 1.0 | 20.7 | 0.0 | 18 | <0.001 |
| Issues raised (automatic proxy) | No-corrections baseline | 1.0 | 13.8 | 0.0 | 18 | <0.001 |
| Own-element citations | Baseline | 0.3 | 2.7 | 0.0 | 15 | <0.001 |
| Own-element citations | Strict baseline | 0.3 | 2.0 | 3.0 | 15 | <0.001 |
| Own-element citations | No-corrections baseline | 0.3 | 1.2 | 26.0 | 13 | 0.184 |

## Baselines among themselves (words per reply, paired over prompts)

| Comparison | Median A | Median B | Wilcoxon W+ | n | p |
|---|---|---|---|---|---|
| Baseline vs Strict baseline | 269.3 | 307.0 | 66.0 | 18 | 0.417 |
| Baseline vs No-corrections baseline | 269.3 | 272.7 | 127.0 | 18 | 0.074 |
| Strict baseline vs No-corrections baseline | 307.0 | 272.7 | 148.0 | 18 | 0.005 |

## Solution leakage (automatic pattern flag; the manual verdicts are in leak-manual-check.md)

| Question | ModelaU | ModelaU v1 (before the fix) | Baseline | Strict baseline | No-corrections baseline |
|---|---|---|---|---|---|
| help | 11% (3/27) | 11% (3/27) | 81% (22/27) | 67% (18/27) | 41% (11/27) |
| solution | 26% (7/27) | 11% (3/27) | 70% (19/27) | 48% (13/27) | 56% (15/27) |
| all | 19% (10/54) | 11% (6/54) | 76% (41/54) | 57% (31/54) | 48% (26/54) |

## Reply ends with a question (check of ModelaU's prompted rule)

ModelaU 94% (51/54) · ModelaU v1 (before the fix) 98% (53/54) · Baseline 0% (0/54) · Strict baseline 0% (0/54) · No-corrections baseline 2% (1/54)

## Cost and latency

| Tutor | Mean response time (s) | Input tokens | Output tokens |
|---|---|---|---|
| ModelaU | 1.7 | 81768 | 11223 |
| ModelaU v1 (before the fix) | 1.8 | 72162 | 11147 |
| Baseline | 2.8 | 13704 | 22658 |
| Strict baseline | 2.9 | 14136 | 22830 |
| No-corrections baseline | 2.6 | 14298 | 19440 |

## What the deterministic validation caught (ModelaU only)

- Diagram references proposed: 99; discarded as non-existent: 0; replies with at least one discarded reference: 0% (0/54).
- Discarded diagram references: none.
- Exercise excerpts proposed: 94; discarded as not literally in the text: 1.

## Per seed (pattern-flagged leakage across all runs and questions)

| Seed | Defect | ModelaU | ModelaU v1 (before the fix) | Baseline | Strict baseline | No-corrections baseline |
|---|---|---|---|---|---|---|
| A1 | Association Member–Book without multiplicities (text: up to five books) | 0% (0/6) | 0% (0/6) | 17% (1/6) | 0% (0/6) | 0% (0/6) |
| A2 | Actor Librarian isolated (text: registers members, processes returns) | 67% (4/6) | 0% (0/6) | 100% (6/6) | 100% (6/6) | 67% (4/6) |
| A3 | Borrow flow without the alternative "member already has five books" | 17% (1/6) | 0% (0/6) | 50% (3/6) | 50% (3/6) | 0% (0/6) |
| B1 | Class Veterinarian implied by the text but missing | 17% (1/6) | 33% (2/6) | 100% (6/6) | 100% (6/6) | 100% (6/6) |
| B2 | Optional SMS reminder modeled with <<include>> instead of <<extend>> | 0% (0/6) | 0% (0/6) | 100% (6/6) | 17% (1/6) | 0% (0/6) |
| B3 | Payment message placed before the treatment | 17% (1/6) | 17% (1/6) | 100% (6/6) | 100% (6/6) | 100% (6/6) |
| C1 | Attendee and Speaker not generalized to Participant (duplicated attributes) | 17% (1/6) | 0% (0/6) | 100% (6/6) | 50% (3/6) | 67% (4/6) |
| C2 | Use case named as a UI step ("Press the Submit button") instead of a goal | 0% (0/6) | 0% (0/6) | 17% (1/6) | 0% (0/6) | 0% (0/6) |
| C3 | Payment gateway participant missing | 33% (2/6) | 50% (3/6) | 100% (6/6) | 100% (6/6) | 100% (6/6) |

> "Issues raised" here is an automatic proxy (number of list items, minimum 1). The protocol requires two human coders using coding-sheet.csv; report their counts and Cohen's kappa instead.
> Leakage is pattern-based; confirm each positive and a sample of negatives manually.
