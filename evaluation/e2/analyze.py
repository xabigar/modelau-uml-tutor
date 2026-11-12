#!/usr/bin/env python3
"""E2 analysis: summary statistics of the instructors' questionnaire.

Usage: python3 evaluation/e2/analyze.py responses.csv [--out e2-results.md]

Reads the CSV exported by the survey app (modelau_survey) and writes a Markdown report with
- the respondents' profile,
- Part A: ModelaU vs. conventional chat per dimension (medians and signs),
- Part B: relevance and expected intrusiveness per mechanism, and the integrated workspace,
- Part C: adoption items,
- Part D: the open answers, verbatim, for thematic coding.
With --aggregate-only the report leaves out the universities and the verbatim open answers.
Blank cells are "don't know / not seen in the video" answers. By default they are left out item by item; with
--impute-mode, single-item ratings (Parts B and C) get the item mode (most frequent answer) over the instructors who
answered it, ties resolved toward the value less favorable to ModelaU, and so does
mechanism 4 (at most three highlights) for the instructors who answered before it replaced "one scenario at a time".
With --impute-mode, Part A blanks (ModelaU or chat rating of a dimension) get the mode as well; the report then also gives
the Part A table on the observed pairs only, as a sensitivity check.
No third-party packages needed.
"""
import argparse, csv, statistics as st
from collections import Counter

DIMS = [('specific', 'Specific'), ('selective', 'Selective'), ('timely', 'Timely'), ('context', 'Contextualized')]
MECHS = [('cite', 'Exact names'), ('highlight', 'Validated highlight'), ('single', 'One issue per reply'),
         ('cap', 'At most three highlights'), ('nudge', 'Inactivity nudge'), ('edit_checks', 'Edit-time checks'),
         ('step', 'Process-step detection'), ('vocab', 'Shared highlight vocabulary')]
ADOPT = [('relative', 'Would rather students used ModelaU than a general chat'),
         ('useful', 'ModelaU would improve students\' modeling learning'),
         ('complex', 'ModelaU\'s mechanisms are easy to understand'),
         ('compat', 'ModelaU fits how I teach modeling'),
         ('intent', 'I would try ModelaU in one of my courses'),
         ('worry', 'I worry students would rely on the tool instead of thinking')]


def num(v):
    v = (v or '').strip()
    return float(v) if v else None


def fmt(x, nd=2):
    return '-' if x is None else (f'{x:.{nd}f}'.rstrip('0').rstrip('.') if isinstance(x, float) else str(x))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('csv')
    ap.add_argument('--out', default='e2-results.md')
    ap.add_argument('--impute-mode', action='store_true',
                    help='fill blank Part B/C ratings with the item mode (ties: the value less favorable to ModelaU)')
    ap.add_argument('--aggregate-only', action='store_true',
                    help='leave out the universities and the verbatim open answers (for publication: respondents consented to aggregated use)')
    a = ap.parse_args()
    rows = list(csv.DictReader(open(a.csv, encoding='utf-8')))
    out = [f'# E2 results ({len(rows)} responses)\n']
    if a.impute_mode:
        observed_rows = [dict(r) for r in rows]
        cols = [f'A_{k}_{t}' for k, _ in DIMS for t in ('mu', 'chat')] + \
               [f'B_{k}_{s}' for k, _ in MECHS for s in ('rel', 'intr')] + ['B_integrated'] + [f'C_{k}' for k, _ in ADOPT]
        filled = []
        for col in cols:
            obs = [num(r[col]) for r in rows if num(r[col]) is not None]
            counts = Counter(obs)
            top = max(counts.values())
            modes = sorted(v for v, c in counts.items() if c == top)
            # Higher is worse for intrusiveness and for the dependence worry; lower is worse for everything else.
            worse_high = col.endswith('_intr') or col.endswith('_chat') or col == 'C_worry'
            m = modes[-1] if worse_high else modes[0]
            tie = f' (tie among {[int(x) for x in modes]})' if len(modes) > 1 else ''
            for i, r in enumerate(rows, 1):
                if num(r[col]) is None:
                    r[col] = repr(m)
                    filled.append(f'{col} (respondent {i}) = {int(m)}{tie}')
        out.append('Blank ratings filled with the item mode: ' + '; '.join(filled) + '\n')

    out.append('## Profile\n')
    for col in ['exp_years', 'ai_use', 'watched', 'modelau_use', 'version']:
        out.append(f'- {col}: ' + ', '.join(f'{k} {v}' for k, v in Counter(r[col] for r in rows).most_common()))
    if not a.aggregate_only:
        out.append('- university: ' + '; '.join(r['university'] for r in rows))
    out.append('')

    def part_a(rows, title):
      out.append(title)
      out.append('| Dimension | Pairs | ModelaU median | Chat median | Median diff. | + / = / - |')
      out.append('|---|---|---|---|---|---|')
      for key, name in DIMS:
        pairs = [(num(r[f'A_{key}_mu']), num(r[f'A_{key}_chat'])) for r in rows]
        pairs = [(m, c) for m, c in pairs if m is not None and c is not None]
        diffs = [m - c for m, c in pairs]
        signs = f'{sum(x > 0 for x in diffs)} / {sum(x == 0 for x in diffs)} / {sum(x < 0 for x in diffs)}'
        out.append(f'| {name} | {len(pairs)} | {fmt(st.median(m for m, _ in pairs))} | {fmt(st.median(c for _, c in pairs))} | '
                   f'{fmt(st.median(diffs))} | {signs} |')
      out.append('')

    if a.impute_mode:
        part_a(rows, '## Part A: ModelaU vs. conventional chat (blanks filled with the mode)\n')
        part_a(observed_rows, '## Part A, sensitivity check: observed pairs only\n')
    else:
        part_a(rows, '## Part A: ModelaU vs. conventional chat\n')

    out.append('## Part B: mechanisms (1-5; intrusiveness: "would get in the student\'s way", lower is better)\n')
    out.append('| Mechanism | n rel. | Relevance mean | Relevance median | n intr. | Intrusiveness mean | Intrusiveness median |')
    out.append('|---|---|---|---|---|---|---|')
    for key, name in MECHS + [('scenario', 'Old mechanism 4: one scenario at a time')]:
        rel = [x for x in (num(r.get(f'B_{key}_rel')) for r in rows) if x is not None]
        intr = [x for x in (num(r.get(f'B_{key}_intr')) for r in rows) if x is not None]
        out.append(f'| {name} | {len(rel)} | {fmt(st.mean(rel)) if rel else "-"} | {fmt(st.median(rel)) if rel else "-"} | '
                   f'{len(intr)} | {fmt(st.mean(intr)) if intr else "-"} | {fmt(st.median(intr)) if intr else "-"} |')
    ig = [x for x in (num(r['B_integrated']) for r in rows) if x is not None]
    out.append(f'\nIntegrated workspace is useful: n {len(ig)}, median {fmt(st.median(ig))}, mean {fmt(st.mean(ig))}, '
               f'agree (4-5) {sum(x >= 4 for x in ig)}/{len(ig)}.\n')

    out.append('## Part C: adoption\n')
    out.append('| Item | n | Median | Mean | Agree (4-5) | Disagree (1-2) |')
    out.append('|---|---|---|---|---|---|')
    for key, text in ADOPT:
        v = [x for x in (num(r[f'C_{key}']) for r in rows) if x is not None]
        out.append(f'| {text} | {len(v)} | {fmt(st.median(v))} | {fmt(st.mean(v))} | {sum(x >= 4 for x in v)}/{len(v)} | {sum(x <= 2 for x in v)}/{len(v)} |')
    out.append('')

    if a.aggregate_only:
        rows = []    # Part D omitted: the open answers are summarized as themes in the paper
    else:
        out.append('## Part D: open answers (verbatim)\n')
    for i, r in enumerate(rows, 1):
        out.append(f'### Respondent {i} ({r["university"]}, {r["exp_years"]}, {r["modelau_use"]})\n')
        for col in ['modelau_experience', 'D_liked', 'D_disliked', 'D_comments']:
            txt = ' '.join((r.get(col) or '').split())
            if txt and txt != '.':
                out.append(f'- **{col}**: {txt}')
        out.append('')

    open(a.out, 'w', encoding='utf-8').write('\n'.join(out))
    print(f'wrote {a.out}')


if __name__ == '__main__':
    main()
