# Evaluation material (E1 and E2)

Material for the formative evaluation reported in the paper: the scripts, the data, and the outputs behind every
table and figure of Section 6, so that each number can be recomputed.

```
evaluation/
  e1/                     E1, technical comparison (ModelaU vs. conventional tutoring prompts, same LLM)
    seeds.js              the 9 seeded diagrams of 3 exercises, the 2 student questions, the baseline prompts, and the development set
    run.js                generates the replies (calls the LLM)
    analyze.js            automatic measures and the blinded coding sheet / coding key
    repo.js               locates this repository: E1 imports the tutor's own prompt, request builder and parsers
    results/en/           the reported study
      replies-gpt-5.4-mini-2026-03-17.jsonl   270 replies (18 prompts x 3 runs x 5 tutors, see below)
      metrics.csv, summary.md                 automatic measures, one row per reply, and their summary
      prompt-modelau-v1.md, -v2.md            ModelaU's prompt before and after the design iteration
      coding-key.csv                          which tutor wrote each coded reply (R001...)
    results/dev/          3 extra class diagrams used to tune the last prompt iteration (not part of the study), NOTES.md
    coding/               human coding of 54 replies by two authors
      E1_coding_author1.xlsx, E1_coding_author2.xlsx   each author's labels (Calibration: 12 replies, Coding: 42)
      agreement.py        agreement (kappa) and consensus sheet; final counts of the coded measures
      agreement.md, consensus.xlsx, table1-coded.md    its outputs; consensus.xlsx holds the settled labels
  e2/                     E2, instructors' judgment after a recorded demonstration
    demo-video-en.mp4     the demonstration the instructors watched (about 4 minutes, silent, captioned)
    questionnaire-en.md   the questionnaire items (English version; respondents could also answer in Spanish)
    baseline_reply.mjs    how the conventional chat's reply shown in the video was produced (same model, no-corrections prompt)
    baseline_reply.json, scenario.mjs                 that reply and the exercise/diagram it answers
    analyze.py            analysis of the questionnaire export (Table 2, Fig. 3)
    e2-results.md         its output, aggregated
```

The design principles with the E1 evidence and E2 ratings for each mechanism are in `../docs/design-principles.md`.

## Where each number of the paper comes from

| Paper | Source | Command (from the folder named) |
|---|---|---|
| Table 1, automatic rows (words, ends with a question, element names cited exactly); references resolved | `e1/results/en/summary.md`, `metrics.csv` | `e1/`: `node analyze.js --lang en --model gpt-5.4-mini-2026-03-17` |
| Table 1, coded rows (issues, correction stated outright, in a question, only pointing) | `e1/coding/table1-coded.md` | `e1/`: `python3 coding/agreement.py finalize coding/consensus.xlsx --out OUT` |
| Kappa and agreement (Threats to Validity) | `e1/coding/agreement.md` | `e1/`: `python3 coding/agreement.py compare coding/E1_coding_author1.xlsx coding/E1_coding_author2.xlsx --out OUT` |
| Design iteration (16 of 96 references, development diagrams) | `e1/results/dev/NOTES.md` and its replies | — |
| Table 2, Fig. 3, E2 Results | `e2/e2-results.md` | `e2/`: `python3 analyze.py responses.csv --impute-mode --aggregate-only --out e2-results.md` |

`analyze.js` rewrites `summary.md`, `metrics.csv` and `coding-key.csv` with identical content (the coding order uses a fixed
seed); it also writes `coding-sheet.csv`, the blinded sheet the coders received (not included in the repository). Run it on a copy if you want
to compare. `summary.md` also reports the automatic leakage flag and the other automatic measures for every tutor; the
paper reports the coded measures.

## Tutors in `results/en`

| Tutor id | In the paper | What it is |
|---|---|---|
| `modelau` | ModelaU | the tutor as reported: `prompt-modelau-v2.md`, its context and server validation |
| `baseline` | Baseline | "Help the student improve their diagram. Do not give the complete solution." |
| `baseline-nocorr` | No-corr. | "Do not give the solution or direct corrections: guide the student to find them by themselves." |
| `baseline-strict` | not reported | "Do not give the solution: guide the student to find it by themselves." A third baseline wording, generated but left out of the paper; automatic measures only, not coded. Its replies stay in the archive because the coding sheet's blinded codes (R001...) were drawn over all 270 replies |
| `modelau-v1` | Design iteration | ModelaU before the design iteration (`prompt-modelau-v1.md`); automatic measures only, not coded |

The human coding uses the first run of each prompt for `modelau`, `baseline` and `baseline-nocorr` (18 replies each).

## Requirements and versions

- Node.js 20.6 or later (tested with 24), no packages to install for E1.
- Python 3 with `openpyxl` for `agreement.py`; `analyze.py` needs only the standard library.
- E1 was generated with this repository at commit `7bfc238` ("Let evident structural problems take precedence over the
  inferred step"): its `prompts/student-assistant.md` is identical to `prompt-modelau-v2.md`, and the code E1 uses
  (`lib.js`, `public/diagram-elements.js`, `public/diagram-relations.js`, `public/procedure-steps.js`) has since only gained
  an unrelated function. The replies were generated on 7 November 2026 with `gpt-5.4-mini-2026-03-17`, default parameters.

## Reproducibility

- **Exact:** every table, figure and statistic above is recomputed from the archived replies, labels and questionnaire
  export with the commands given.
- **Approximate:** generating new replies (`node --env-file=../../.env run.js --lang en --model gpt-5.4-mini-2026-03-17
  --tutors modelau,baseline,baseline-strict,baseline-nocorr`, with `OPENAI_API_KEY` in the repository's `.env`) calls the
  same dated model, but LLM output varies between calls, so new replies will be similar, not identical. `node run.js --mock`
  tests the pipeline without network access.
- **E2:** the questionnaire answers are not published row by row. Respondents agreed to the use of their answers in
  aggregated form, and the profile and free-text answers could identify them. `e2-results.md` is the aggregated output of
  `analyze.py` (option `--aggregate-only`); the open answers are summarized as themes in the paper.

## Notes on E2

- Blank ratings are "don't know / not seen in the video" answers. With `--impute-mode` they take the item's most frequent
  answer (ties: the value less favorable to ModelaU); the report also gives the ModelaU-vs-chat comparison on the observed
  pairs only.
- Mechanism 4 changed while the questionnaire was open: it was "one scenario at a time" until 10 November 2026 and is now
  "at most three highlights". The two instructors who answered on 9 November rated the earlier mechanism (`B_scenario_*`
  in the export) and were informed of the change; their mechanism-4 ratings take the mode of the other six, as described
  in the paper. The video in this folder is the current version.
