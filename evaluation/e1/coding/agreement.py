#!/usr/bin/env python3
"""Agreement between the two authors' codings for E1, and the final counts for Table 1.

Each author fills one workbook (E1_coding_authorN.xlsx) with two sheets that both belong to the study (54 replies = 12 + 42):
"Calibration" (12 replies, used to settle the rubric together) and "Coding" (42 replies, coded separately). In both sheets the header
is in row 1 and every reply has a code (column A), `issues` (column F, whole number) and `leak` (column G: leak / borderline / hint).
Column H holds free notes.

The two variables coded are:
  issues  number of distinct problems the reply asks the student to change or check
  leak    how much of the fix the reply gives away (hint < borderline < leak)

Step 1, agreement and consensus sheet (once both workbooks are filled):

    python3 coding/agreement.py compare E1_coding_author1.xlsx E1_coding_author2.xlsx [--out DIR]

  writes  agreement.md     kappa and exact agreement between the authors on the replies coded separately (the 42 of "Coding");
                           the 12 of "Calibration" are reported apart and left out of the agreement, because the rubric was
                           settled together on them
          consensus.xlsx   all 54 replies; values on which the authors agree are prefilled, disagreements are left blank (red)
                           for the two authors to settle together
  (default output folder: next to this script)

Step 2, final numbers (after the red cells are settled in consensus.xlsx):

    python3 coding/agreement.py finalize consensus.xlsx [--out DIR]

  joins the consensus labels with results/en/coding-key.csv (which tells which tutor wrote each reply) and writes
  table1-coded.md: counts per tutor and the LaTeX rows for Table 1 of the paper.

Tutors reviewed: ModelaU (last version), the baseline and the no-corrections baseline (54 replies, 18 each).

Requires: pip install openpyxl
"""
import csv
import statistics
import sys
import pathlib
from collections import Counter, defaultdict

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

HERE = pathlib.Path(__file__).resolve().parent
RES = HERE.parent / "results" / "en"
LEAK_LEVELS = ["hint", "borderline", "leak"]  # ordinal: how much is given away
TUTORS = [("modelau", "ModelaU"), ("baseline", "Baseline"), ("baseline-nocorr", "No-corr.")]
SHEET_CAL, SHEET_COD = "Calibration", "Coding"
C_CODE, C_ISSUES, C_LEAK, C_NOTES = 1, 6, 7, 8


# ---------------------------------------------------------------- reading
def load_coding(path, sheet):
    wb = load_workbook(path, data_only=True)
    if sheet not in wb.sheetnames:
        sys.exit(f"{path}: no sheet named {sheet!r} (found {wb.sheetnames})")
    ws = wb[sheet]
    out = {}
    for r in range(2, ws.max_row + 1):
        code = ws.cell(row=r, column=C_CODE).value
        if not (isinstance(code, str) and code[:1] == "R" and code[1:].isdigit()):
            continue  # header, or continuation rows of a long reply
        issues, leak, notes = (ws.cell(row=r, column=c).value for c in (C_ISSUES, C_LEAK, C_NOTES))
        leak = str(leak).strip().lower() if leak not in (None, "") else None
        try:
            issues = int(float(issues)) if issues not in (None, "") else None
        except (TypeError, ValueError):
            sys.exit(f"{path}: row {r} ({code}) has a non-numeric value in issues: {issues!r}")
        if leak is not None and leak not in LEAK_LEVELS:
            sys.exit(f"{path}: row {r} ({code}) has leak={leak!r}; expected one of {LEAK_LEVELS}")
        out[code] = {"issues": issues, "leak": leak, "notes": notes, "row": r, "defect": ws.cell(row=r, column=3).value}
    return out


def incomplete(coding):
    return [c for c, v in coding.items() if None in (v["issues"], v["leak"])]


def load_both(p, sheet):
    c = load_coding(p, sheet)
    miss = incomplete(c)
    if miss:
        sys.exit(f"{p} ({sheet}): {len(miss)} rows are not fully done yet (first: {', '.join(miss[:8])})")
    return c


# ---------------------------------------------------------------- statistics
def cohen_kappa(a, b, categories, weights=None):
    """Cohen's kappa (weights=None, 'linear' or 'quadratic') for two lists of labels."""
    k = len(categories)
    idx = {c: i for i, c in enumerate(categories)}
    n = len(a)
    obs = [[0.0] * k for _ in range(k)]
    for x, y in zip(a, b):
        obs[idx[x]][idx[y]] += 1
    row = [sum(obs[i]) for i in range(k)]
    col = [sum(obs[i][j] for i in range(k)) for j in range(k)]

    def w(i, j):
        if weights is None:
            return 0.0 if i == j else 1.0
        d = abs(i - j) / (k - 1) if k > 1 else 0.0
        return d if weights == "linear" else d * d

    num = sum(w(i, j) * obs[i][j] for i in range(k) for j in range(k))
    den = sum(w(i, j) * row[i] * col[j] / n for i in range(k) for j in range(k))
    return float("nan") if den == 0 else 1 - num / den


def fmt(x):
    return "n/a" if x != x else f"{x:.2f}"


def describe(kappa):
    if kappa != kappa:
        return "undefined (no variation)"
    for limit, label in ((0.2, "slight"), (0.4, "fair"), (0.6, "moderate"), (0.8, "substantial")):
        if kappa < limit:
            return label
    return "almost perfect"


def variables(rows, codes):
    leak = [rows[c]["leak"] for c in codes]
    return {
        "leak (3 levels, unweighted)": (leak, None),
        "leak (3 levels, linear weights)": (leak, "linear"),
        "leak (leak or borderline vs hint)": (["given" if x != "hint" else "hint" for x in leak], None),
        "issues (quadratic weights)": ([rows[c]["issues"] for c in codes], "quadratic"),
    }


def categories_for(name, *lists):
    if name.startswith("leak (leak or"):
        return ["hint", "given"]
    if name.startswith("leak"):
        return LEAK_LEVELS
    return list(range(max(max(l) for l in lists) + 1))


def agreement_table(c1, c2, codes):
    v1, v2 = variables(c1, codes), variables(c2, codes)
    lines = ["| Variable | Cohen's kappa | Reading | Exact agreement |", "|---|---|---|---|"]
    stats = {}
    for name in v1:
        a, b = v1[name][0], v2[name][0]
        k = cohen_kappa(a, b, categories_for(name, a, b), v1[name][1])
        stats[name] = k
        lines.append(f"| {name} | {fmt(k)} | {describe(k)} | {100 * sum(x == y for x, y in zip(a, b)) / len(a):.0f}% |")
    return lines, stats


def detail(c1, c2, codes):
    i1, i2 = [c1[c]["issues"] for c in codes], [c2[c]["issues"] for c in codes]
    lines = [f"Issues: within one issue of each other in {100 * sum(abs(x - y) <= 1 for x, y in zip(i1, i2)) / len(codes):.0f}% of the replies; "
             f"mean absolute difference {statistics.mean(abs(x - y) for x, y in zip(i1, i2)):.2f}.", "",
             "Leak, author 1 (rows) vs author 2 (columns):", "", "| | " + " | ".join(LEAK_LEVELS) + " |", "|---|" + "---|" * len(LEAK_LEVELS)]
    cm = Counter((c1[c]["leak"], c2[c]["leak"]) for c in codes)
    for a in LEAK_LEVELS:
        lines.append(f"| **{a}** | " + " | ".join(str(cm[(a, b)]) for b in LEAK_LEVELS) + " |")
    return lines


# ---------------------------------------------------------------- compare
def compare(p1, p2, out):
    c1, c2 = load_both(p1, SHEET_COD), load_both(p2, SHEET_COD)
    k1, k2 = load_both(p1, SHEET_CAL), load_both(p2, SHEET_CAL)
    if set(c1) != set(c2) or set(k1) != set(k2) or set(c1) & set(k1):
        sys.exit("The two workbooks must contain the same codes in each sheet, and none shared between Calibration and Coding.")
    codes, cal = sorted(c1), sorted(k1)

    lines = ["# E1 agreement between the two authors", "",
             f"Replies coded separately by both authors (sheet “{SHEET_COD}”): {len(codes)}.",
             f"Calibration replies (sheet “{SHEET_CAL}”, used to settle the rubric): {len(cal)}; reported apart, not counted in the agreement.", "",
             f"## 1. Agreement on the {len(codes)} replies coded separately", ""]
    tl, stats = agreement_table(c1, c2, codes)
    lines += tl + [""] + detail(c1, c2, codes)
    n_dis = sum(1 for c in codes if (c1[c]["leak"], c1[c]["issues"]) != (c2[c]["leak"], c2[c]["issues"]))
    lines += ["", f"Replies with at least one disagreement between the authors: {n_dis} of {len(codes)}.", "",
              "Suggested wording for the paper:", "",
              f"> Two authors coded {len(codes)} replies separately with the rubric (after settling the rubric together on {len(cal)} further replies). "
              f"Their agreement was $\\kappa$ = {fmt(stats['leak (3 levels, linear weights)'])} for leakage (three levels, linearly weighted) "
              f"and {fmt(stats['issues (quadratic weights)'])} for issues raised (quadratically weighted). "
              f"The {n_dis} replies with a disagreement were settled by discussion, and the consensus labels are the ones reported."]
    tlk, sk = agreement_table(k1, k2, cal)
    lines += ["", f"## 2. Calibration replies ({len(cal)}, rubric settled together: for reference only)", ""] + tlk + [""]
    n_dis_cal = sum(1 for c in cal if (k1[c]["leak"], k1[c]["issues"]) != (k2[c]["leak"], k2[c]["issues"]))
    lines += [f"Replies with a disagreement: {n_dis_cal} of {len(cal)}. Leak levels in this set: " +
              ", ".join(f"{l} {sum(k1[c]['leak'] == l for c in cal)}" for l in LEAK_LEVELS) +
              "; with so little variation kappa is not informative here."]
    allc = codes + cal
    ca, cb = {**c1, **k1}, {**c2, **k2}
    tla, sa = agreement_table(ca, cb, allc)
    lines += ["", f"## 3. All {len(allc)} replies pooled (for reference)", ""] + tla

    out.mkdir(parents=True, exist_ok=True)
    (out / "agreement.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # ---- consensus workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Consensus"
    head = ["Code", "Seeded defect", "Status", "A1 issues", "A1 leak", "A2 issues", "A2 leak", "FINAL issues", "FINAL leak", "Notes A1", "Notes A2", "Notes (consensus)"]
    widths = [8, 38, 26, 9, 12, 9, 12, 11, 14, 30, 30, 40]
    yellow = PatternFill("solid", fgColor="FFF2CC")
    red = PatternFill("solid", fgColor="F8CBAD")
    for i, (h, w) in enumerate(zip(head, widths), start=1):
        c = ws.cell(row=1, column=i, value=h)
        c.font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="1F3864")
        c.alignment = Alignment(wrap_text=True, horizontal="center", vertical="center")
        ws.column_dimensions[c.column_letter].width = w
    dv_leak = DataValidation(type="list", formula1='"leak,borderline,hint"', allow_blank=True)
    dv_iss = DataValidation(type="whole", operator="between", formula1="0", formula2="40", allow_blank=True)
    ws.add_data_validation(dv_leak)
    ws.add_data_validation(dv_iss)
    blind = set(cal)
    agree = lambda c: ca[c]["leak"] == cb[c]["leak"] and ca[c]["issues"] == cb[c]["issues"]
    order = sorted(allc, key=lambda c: (agree(c), c))
    for r, code in enumerate(order, start=2):
        a, b = ca[code], cb[code]
        diffs = [n for n in ("issues", "leak") if a[n] != b[n]]
        status = ("Full agreement" if not diffs else "Disagree on: " + ", ".join(diffs)) + (" · calibration" if code in blind else "")
        vals = [code, (ca.get(code) or {}).get("defect"), status, a["issues"], a["leak"], b["issues"], b["leak"],
                a["issues"] if a["issues"] == b["issues"] else None, a["leak"] if a["leak"] == b["leak"] else None,
                a["notes"], b["notes"], None]
        for c, v in enumerate(vals, start=1):
            cell = ws.cell(row=r, column=c, value=v)
            cell.font = Font(name="Arial", size=10)
            cell.alignment = Alignment(wrap_text=(c in (2, 10, 11, 12)), vertical="top", horizontal="center" if 4 <= c <= 9 else "left")
            if c in (8, 9):
                cell.fill = yellow if v is not None else red
            if c == 12:
                cell.fill = yellow
        dv_iss.add(f"H{r}")
        dv_leak.add(f"I{r}")
    ws.freeze_panes = "B2"
    ws.auto_filter.ref = f"A1:L{len(order) + 1}"
    wb.save(out / "consensus.xlsx")
    n_all = sum(1 for c in allc if not agree(c))
    print("\n".join(lines))
    print(f"\nWrote {out}/agreement.md and consensus.xlsx ({n_all} replies to settle: red cells). Look the codes up in each author's workbook.")


# ---------------------------------------------------------------- finalize
def finalize(path, out):
    wb = load_workbook(path, data_only=True)
    ws = wb["Consensus"]
    final, blanks = {}, []
    for r in range(2, ws.max_row + 1):
        code = ws.cell(row=r, column=1).value
        if not code:
            continue
        iss, leak = (ws.cell(row=r, column=c).value for c in (8, 9))
        if None in (iss, leak):
            blanks.append(code)
        else:
            final[code] = {"issues": int(iss), "leak": str(leak).strip().lower()}
    if blanks:
        sys.exit(f"{len(blanks)} replies still have no FINAL value in the consensus sheet (first: {', '.join(blanks[:10])}).")
    key = {r["code"]: r["key"].split("|") + [r["tutor"]] for r in csv.DictReader(open(RES / "coding-key.csv", encoding="utf-8"))}
    per = defaultdict(list)
    for code, v in final.items():
        seed, question, run, tutor1, tutor = key[code]
        per[tutor].append({**v, "seed": seed, "question": question})
    prompts = sorted({(x["seed"], x["question"]) for t in per.values() for x in t})

    def median_issues(t):
        return statistics.median(statistics.mean(x["issues"] for x in per[t] if (x["seed"], x["question"]) == p) for p in prompts)

    rows = {}
    for t, label in TUTORS:
        rs = per[t]
        n = len(rs)
        if n == 0:
            continue
        cnt = Counter(x["leak"] for x in rs)
        rows[t] = {
            "n": n, "leak": cnt["leak"], "borderline": cnt["borderline"], "hint": cnt["hint"], "issues_med": median_issues(t),
            "issues_mean": statistics.mean(x["issues"] for x in rs), "one_issue": sum(x["issues"] == 1 for x in rs),
            "help_given": sum(1 for x in rs if x["question"] == "help" and x["leak"] != "hint"),
            "sol_given": sum(1 for x in rs if x["question"] == "solution" and x["leak"] != "hint"),
            "n_help": sum(1 for x in rs if x["question"] == "help"), "n_sol": sum(1 for x in rs if x["question"] == "solution"),
        }
    TUT = [(t, l) for t, l in TUTORS if t in rows]
    md = ["# E1 final counts (consensus labels; first run of each prompt)", "", "| Measure | " + " | ".join(l for _, l in TUT) + " |", "|---|" + "---|" * len(TUT)]

    def row(label, f):
        md.append(f"| {label} | " + " | ".join(f(rows[t]) for t, _ in TUT) + " |")
    row("Distinct issues per reply (median over prompts)", lambda r: f"{r['issues_med']:.1f}")
    row("Distinct issues per reply (mean)", lambda r: f"{r['issues_mean']:.1f}")
    row("Replies raising exactly one issue", lambda r: f"{r['one_issue']}/{r['n']}")
    row("Replies stating a correction outright", lambda r: f"{r['leak']}/{r['n']}")
    row("Replies naming it only in a question", lambda r: f"{r['borderline']}/{r['n']}")
    row("Replies only pointing at the requirement", lambda r: f"{r['hint']}/{r['n']}")
    row("Outright or in a question, to a request for help", lambda r: f"{r['help_given']}/{r['n_help']}")
    row("Outright or in a question, to a request for the solution", lambda r: f"{r['sol_given']}/{r['n_sol']}")
    pc = lambda r, k: f"{r[k]}/{r['n']} ({round(100 * r[k] / r['n'])}\\%)"
    num = lambda x: f"{x:.0f}" if x == int(x) else f"{x:.1f}"
    tex = ["", "## LaTeX rows for Table 1 (paper.tex; columns: " + ", ".join(l for _, l in TUT) + ")", "", "```",
           "Distinct issues per reply (median, coded) & " + " & ".join(num(rows[t]["issues_med"]) for t, _ in TUT) + "\\\\",
           "Replies stating a correction outright & " + " & ".join(pc(rows[t], "leak") for t, _ in TUT) + "\\\\",
           "Replies naming it only in a question & " + " & ".join(f"{rows[t]['borderline']}/{rows[t]['n']}" for t, _ in TUT) + "\\\\",
           "Replies only pointing at the requirement & " + " & ".join(f"{rows[t]['hint']}/{rows[t]['n']}" for t, _ in TUT) + "\\\\", "```"]
    out.mkdir(parents=True, exist_ok=True)
    (out / "table1-coded.md").write_text("\n".join(md + tex) + "\n", encoding="utf-8")
    print("\n".join(md + tex))
    print(f"\nWrote {out}/table1-coded.md")


if __name__ == "__main__":
    a = sys.argv[1:]
    out = HERE
    if "--out" in a:
        i = a.index("--out")
        out = pathlib.Path(a[i + 1]).expanduser()
        del a[i:i + 2]
    if len(a) == 3 and a[0] == "compare":
        compare(a[1], a[2], out)
    elif len(a) == 2 and a[0] == "finalize":
        finalize(a[1], out)
    else:
        print(__doc__)
        sys.exit(1)
