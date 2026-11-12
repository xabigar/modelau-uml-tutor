#!/usr/bin/env python3
"""E2 analysis: summary statistics of the instructors' questionnaire.

Usage: python3 evaluation/e2/analyze.py responses.csv [--out e2-results.md]

Reads the CSV exported by the survey app (modelau_survey) and writes a Markdown report with
- the respondents' profile,
- Part A: ModelaU's feedback on each dimension (median, instructors agreeing), and the rating distributions of Fig. 3,
- Part B: relevance and expected intrusiveness per mechanism, and the integrated workspace,
- Part C: adoption items,
- Part D: the open answers, verbatim, for thematic coding.
With --aggregate-only the report leaves out the universities and the verbatim open answers.
Blank cells are "don't know / not seen in the video" answers: they are left out item by item, and every table gives the n
behind each figure. The two instructors who answered before mechanism 4 (at most three highlights) replaced "one scenario at a time"
rated the earlier mechanism (columns B_scenario_*), so mechanism 4 is rated by the other six.
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
    ap.add_argument('--aggregate-only', action='store_true',
                    help='leave out the universities and the verbatim open answers (for publication: respondents consented to aggregated use)')
    a = ap.parse_args()
    rows = list(csv.DictReader(open(a.csv, encoding='utf-8')))
    out = [f'# E2 results ({len(rows)} responses)\n']
    out.append('## Profile\n')
    for col in ['exp_years', 'ai_use', 'watched', 'modelau_use']:
        out.append(f'- {col}: ' + ', '.join(f'{k} {v}' for k, v in Counter(r[col] for r in rows).most_common()))
    if not a.aggregate_only:
        out.append('- university: ' + '; '.join(r['university'] for r in rows))
    out.append('')

    out.append("## Part A: ModelaU's feedback on each dimension\n")
    out.append('| Dimension | n | Median | Agree (4-5) |')
    out.append('|---|---|---|---|')
    for key, name in DIMS:
        v = [x for x in (num(r[f'A_{key}_mu']) for r in rows) if x is not None]
        out.append(f'| {name} | {len(v)} | {fmt(st.median(v))} | {sum(x >= 4 for x in v)}/{len(v)} |')
    out.append('')

    out.append('## Rating distributions (Fig. 3): instructors giving each rating, "don\'t know" left out\n')
    out.append('| Item | n | 1 | 2 | 3 | 4 | 5 |')
    out.append('|---|---|---|---|---|---|---|')
    for col, name in [(f'A_{k}_mu', f"ModelaU's feedback is {n.lower()}") for k, n in DIMS] + [(f'C_{k}', n) for k, n in ADOPT]:
        v = [x for x in (num(r[col]) for r in rows) if x is not None]
        out.append(f'| {name} | {len(v)} | ' + ' | '.join(str(sum(x == i for x in v)) for i in range(1, 6)) + ' |')
    out.append('')

    out.append('## Part B: mechanisms (1-5; intrusiveness: "would get in the student\'s way", lower is better), Fig. 4\n')
    out.append('| Mechanism | n rel. | Relevance mean | n intr. | Intrusiveness mean |')
    out.append('|---|---|---|---|---|')
    for key, name in MECHS:
        rel = [x for x in (num(r.get(f'B_{key}_rel')) for r in rows) if x is not None]
        intr = [x for x in (num(r.get(f'B_{key}_intr')) for r in rows) if x is not None]
        out.append(f'| {name} | {len(rel)} | {fmt(st.mean(rel))} | {len(intr)} | {fmt(st.mean(intr))} |')
    ig = [x for x in (num(r['B_integrated']) for r in rows) if x is not None]
    out.append(f'\nIntegrated workspace is useful: n {len(ig)}, median {fmt(st.median(ig))}, agree (4-5) {sum(x >= 4 for x in ig)}/{len(ig)}.\n')

    out.append('## Part C: adoption\n')
    out.append('| Item | n | Median | Agree (4-5) | Disagree (1-2) |')
    out.append('|---|---|---|---|---|')
    for key, text in ADOPT:
        v = [x for x in (num(r[f'C_{key}']) for r in rows) if x is not None]
        out.append(f'| {text} | {len(v)} | {fmt(st.median(v))} | {sum(x >= 4 for x in v)}/{len(v)} | {sum(x <= 2 for x in v)}/{len(v)} |')
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
