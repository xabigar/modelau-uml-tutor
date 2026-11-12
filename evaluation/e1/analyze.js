// E1 analysis. Usage: node analyze.js [--lang en|es] [--model ID] [--include-mock]
// Reads results/replies.jsonl and writes, in results/:
//   metrics.csv          one row per reply, automatic metrics
//   summary.md           ModelaU vs each baseline, paired over the 18 prompts
//   coding-sheet.csv     blinded replies for two human coders (issues raised)
//   coding-key.csv       maps blinded codes back to tutor (keep away from coders)
//   e2-pairs.md          12 blinded reply pairs for the instructors (E2, ModelaU vs 'baseline')
//   e2-key.csv           which of X/Y is ModelaU (keep away from instructors)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromRepo } from './repo.js';
import { getStudy } from './seeds.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const { encodePlantUML } = await fromRepo('lib.js');
const { parseElements } = await fromRepo('public/diagram-elements.js');
const li = process.argv.indexOf('--lang');
const lang = li >= 0 ? process.argv[li + 1] : 'en';
const { seeds, questions } = getStudy(lang);
const dir = path.join(here, 'results', lang);
const includeMock = process.argv.includes('--include-mock');
const mi = process.argv.indexOf('--model');
const model = mi >= 0 ? process.argv[mi + 1] : (includeMock ? 'mock' : (process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o'));
const seedById = Object.fromEntries(seeds.map(s => [s.id, s]));

let records = readFileSync(path.join(dir, `replies-${model}.jsonl`), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
if (!includeMock) records = records.filter(r => !r.mock);
if (!records.length) { console.error('No replies to analyze (use --include-mock for a mock run).'); process.exit(1); }

// ---------- per-reply metrics
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function citations(text, seed) {
  const names = [...new Set(parseElements(seed.diagramType, seed.code).flatMap(e => [e.name, e.id]))];
  return names.filter(n => new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(n)}(?![\\p{L}\\p{N}_])`, n.includes(' ') ? 'iu' : 'u').test(text));
}
for (const r of records) {
  const seed = seedById[r.seed], text = r.message || '';
  r.words = (text.match(/\S+/g) || []).length;
  r.listItems = (text.match(/^\s*(\d+[.)]|[-•*])\s+/gm) || []).length;
  r.issuesProxy = Math.max(1, r.listItems);
  r.leak = seed.leak.every(re => re.test(text));
  r.cited = citations(text, seed);
  r.citations = r.cited.length;
  r.endsWithQuestion = /\?\s*$/.test(text.trim());
}

// ---------- statistics
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function wilcoxon(xs, ys) {
  const d = xs.map((x, i) => x - ys[i]).filter(v => v !== 0);
  const n = d.length;
  if (!n) return { n, W: 0, p: 1 };
  const order = d.map((v, i) => [Math.abs(v), i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(n);
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && order[j + 1][0] === order[i][0]) j++; const r = (i + j + 2) / 2; for (let k = i; k <= j; k++) ranks[order[k][1]] = r; i = j + 1; }
  const Wplus = d.reduce((s, v, i) => s + (v > 0 ? ranks[i] : 0), 0);
  let p;
  if (n <= 20) { // exact: enumerate all sign assignments
    let le = 0, ge = 0; const total = 2 ** n;
    for (let mask = 0; mask < total; mask++) { let w = 0; for (let i = 0; i < n; i++) if (mask & (1 << i)) w += ranks[i]; if (w <= Wplus + 1e-9) le++; if (w >= Wplus - 1e-9) ge++; }
    p = Math.min(1, 2 * Math.min(le, ge) / total);
  } else {
    const mu = n * (n + 1) / 4, sd = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24), z = (Wplus - mu) / sd;
    p = Math.min(1, 2 * (1 - normalCdf(Math.abs(z))));
  }
  return { n, W: Wplus, p };
}
function normalCdf(z) { const t = 1 / (1 + 0.2316419 * z), d = 0.3989423 * Math.exp(-z * z / 2); return 1 - d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); }

const ALL_TUTORS = ['modelau', 'modelau-v1', 'baseline', 'baseline-strict', 'baseline-nocorr'];
const LABEL = { modelau: 'ModelaU', 'modelau-v1': 'ModelaU v1 (before the fix)', baseline: 'Baseline', 'baseline-strict': 'Strict baseline', 'baseline-nocorr': 'No-corrections baseline' };
const tutors = ALL_TUTORS.filter(t => records.some(r => r.tutor === t));
const baselines = tutors.filter(t => !t.startsWith('modelau'));
const prompts = seeds.flatMap(s => Object.keys(questions).map(q => `${s.id}|${q}`));
const perPrompt = (tutor, field) => prompts.map(p => { const [seed, q] = p.split('|'); const rs = records.filter(r => r.seed === seed && r.question === q && r.tutor === tutor); return rs.length ? mean(rs.map(r => +r[field])) : NaN; });
const complete = prompts.map((_, i) => tutors.every(t => !Number.isNaN(perPrompt(t, 'words')[i])));
const paired = (field, other = 'baseline') => { const m = perPrompt('modelau', field).filter((_, i) => complete[i]), b = perPrompt(other, field).filter((_, i) => complete[i]); return { m, b, test: wilcoxon(m, b) }; };
const fmt = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : 'n/a';
const pct = (rs, f) => rs.length ? `${(100 * rs.filter(f).length / rs.length).toFixed(0)}% (${rs.filter(f).length}/${rs.length})` : 'n/a';

// ---------- summary
const by = (tutor, extra = () => true) => records.filter(r => r.tutor === tutor && extra(r));
const lines = [];
lines.push(`# E1 technical comparison — summary`, '', `Model: ${[...new Set(records.map(r => r.model))].join(', ')} · replies: ${records.length} · tutors: ${tutors.map(t => LABEL[t]).join(', ')} · prompts with all tutors: ${complete.filter(Boolean).length}/${prompts.length}${includeMock ? ' · **MOCK DATA INCLUDED**' : ''}`, '');
lines.push('## Paired comparison, ModelaU vs each baseline (mean over runs, per prompt)', '', '| Metric | Baseline | ModelaU median | Baseline median | Wilcoxon W+ | n | p (exact, two-sided) |', '|---|---|---|---|---|---|---|');
for (const [label, field] of [['Words per reply', 'words'], ['Issues raised (automatic proxy)', 'issuesProxy'], ['Own-element citations', 'citations']]) {
  for (const b of baselines) {
    const { m, b: bv, test } = paired(field, b);
    lines.push(`| ${label} | ${LABEL[b]} | ${fmt(median(m))} | ${fmt(median(bv))} | ${fmt(test.W)} | ${test.n} | ${test.p < 0.001 ? '<0.001' : fmt(test.p, 3)} |`);
  }
}
lines.push('', '## Baselines among themselves (words per reply, paired over prompts)', '', '| Comparison | Median A | Median B | Wilcoxon W+ | n | p |', '|---|---|---|---|---|---|');
for (let a = 0; a < baselines.length; a++) for (let c = a + 1; c < baselines.length; c++) {
  const x = perPrompt(baselines[a], 'words').filter((_, i) => complete[i]), y = perPrompt(baselines[c], 'words').filter((_, i) => complete[i]), t = wilcoxon(x, y);
  lines.push(`| ${LABEL[baselines[a]]} vs ${LABEL[baselines[c]]} | ${fmt(median(x))} | ${fmt(median(y))} | ${fmt(t.W)} | ${t.n} | ${t.p < 0.001 ? '<0.001' : fmt(t.p, 3)} |`);
}
lines.push('', "## Solution leakage (automatic pattern flag; the manual verdicts are in leak-manual-check.md)", '', `| Question | ${tutors.map(t => LABEL[t]).join(' | ')} |`, `|---|${tutors.map(() => '---').join('|')}|`);
for (const q of Object.keys(questions)) lines.push(`| ${q} | ${tutors.map(t => pct(by(t, r => r.question === q), r => r.leak)).join(' | ')} |`);
lines.push(`| all | ${tutors.map(t => pct(by(t), r => r.leak)).join(' | ')} |`);
lines.push('', '## Reply ends with a question (check of ModelaU\'s prompted rule)', '', tutors.map(t => `${LABEL[t]} ${pct(by(t), r => r.endsWithQuestion)}`).join(' · '));
lines.push('', '## Cost and latency', '', '| Tutor | Mean response time (s) | Input tokens | Output tokens |', '|---|---|---|---|');
for (const t of tutors) { const rs = by(t); lines.push(`| ${LABEL[t]} | ${fmt(mean(rs.map(r => r.ms)) / 1000)} | ${rs.reduce((x, r) => x + (r.usage?.prompt_tokens || 0), 0)} | ${rs.reduce((x, r) => x + (r.usage?.completion_tokens || 0), 0)} |`); }
const m = by('modelau');
const invalidDiagram = m.flatMap(r => r.diagramHighlightsInvalid || []), invalidExercise = m.flatMap(r => r.highlightsInvalid || []);
lines.push('', '## What the deterministic validation caught (ModelaU only)', '',
  `- Diagram references proposed: ${m.reduce((s, r) => s + (r.diagramHighlightsRaw || 0), 0)}; discarded as non-existent: ${invalidDiagram.length}; replies with at least one discarded reference: ${pct(m, r => (r.diagramHighlightsInvalid || []).length > 0)}.`,
  `- Discarded diagram references: ${invalidDiagram.length ? [...new Set(invalidDiagram.map(String))].join(', ') : 'none'}.`,
  `- Exercise excerpts proposed: ${m.reduce((s, r) => s + (r.highlightsRaw || 0), 0)}; discarded as not literally in the text: ${invalidExercise.length}.`);
lines.push('', '## Per seed (pattern-flagged leakage across all runs and questions)', '', `| Seed | Defect | ${tutors.map(t => LABEL[t]).join(' | ')} |`, `|---|---|${tutors.map(() => '---').join('|')}|`);
for (const s of seeds) lines.push(`| ${s.id} | ${s.defect} | ${tutors.map(t => pct(by(t, r => r.seed === s.id), r => r.leak)).join(' | ')} |`);
lines.push('', '> "Issues raised" here is an automatic proxy (number of list items, minimum 1). The protocol requires two human coders using coding-sheet.csv; report their counts and Cohen\'s kappa instead.', '> Leakage is pattern-based; confirm each positive and a sample of negatives manually.');
writeFileSync(path.join(dir, 'summary.md'), lines.join('\n') + '\n');

// ---------- metrics.csv
const csv = rows => rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
writeFileSync(path.join(dir, 'metrics.csv'), csv([
  ['key', 'seed', 'diagramType', 'question', 'run', 'tutor', 'words', 'listItems', 'issuesProxy', 'leak', 'citations', 'cited', 'endsWithQuestion', 'diagramHighlightsRaw', 'diagramHighlightsInvalid', 'highlightsRaw', 'highlightsInvalid', 'message'],
  ...records.map(r => [r.key, r.seed, r.diagramType, r.question, r.run, r.tutor, r.words, r.listItems, r.issuesProxy, r.leak, r.citations, r.cited.join('; '), r.endsWithQuestion, r.diagramHighlightsRaw ?? '', (r.diagramHighlightsInvalid || []).join('; '), r.highlightsRaw ?? '', (r.highlightsInvalid || []).join('; '), r.message]),
]));

// ---------- reproducible shuffling
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mkShuffle = rnd => a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
// The coding sheet has its own stream, so adding tutors never changes the E2 pair selection.
const shuffleCoding = mkShuffle(rng(20261109));
// E2 stream: burns the 107 draws the first release spent on shuffling 108 replies, so the E2 key stays identical.
const rand = rng(20261108); for (let i = 0; i < 107; i++) rand();
const shuffle = mkShuffle(rand);

// ---------- blinded coding sheet
const coded = shuffleCoding(records).map((r, i) => ({ code: `R${String(i + 1).padStart(3, '0')}`, r }));
writeFileSync(path.join(dir, 'coding-sheet.csv'), csv([['code', 'seed', 'seeded_defect', 'question', 'reply', 'issues_coder1', 'issues_coder2', 'leak_coder1(leak/borderline/hint)', 'leak_coder2(leak/borderline/hint)', 'defect_addressed_coder1(0/1)', 'defect_addressed_coder2(0/1)', 'notes'], ...coded.map(({ code, r }) => [code, r.seed, seedById[r.seed].defect, questions[r.question], r.message, '', '', '', '', '', '', ''])]));
writeFileSync(path.join(dir, 'coding-key.csv'), csv([['code', 'key', 'tutor'], ...coded.map(({ code, r }) => [code, r.key, r.tutor])]));

// ---------- E2 pairs: per diagram type, 2 help + 2 solution prompts, run 1
const md = ['# E2 — Blind rating pairs', '', 'For each pair, rate reply X and reply Y separately (1 = strongly disagree … 5 = strongly agree) on: specific, selective, contextualized, does not give the solution, technically correct. Then state which reply you would rather a student receive (X / Y / no preference).', ''];
const key = [['pair', 'seed', 'question', 'X', 'Y']];
let pairNo = 0;
for (const type of ['class', 'usecase', 'sequence']) {
  const ofType = seeds.filter(s => s.diagramType === type).map(s => s.id);
  for (const q of ['help', 'solution']) for (const seedId of shuffle(ofType).slice(0, 2)) {
    const pick = t => records.find(r => r.seed === seedId && r.question === q && r.tutor === t && r.run === 1) || records.find(r => r.seed === seedId && r.question === q && r.tutor === t);
    const mo = pick('modelau'), ba = pick('baseline');
    if (!mo || !ba) continue;
    const swap = rand() < 0.5, X = swap ? ba : mo, Y = swap ? mo : ba, s = seedById[seedId];
    pairNo++;
    md.push(`---`, '', `## Pair ${pairNo}`, '', `**Exercise.** ${s.exerciseText}`, '', `**Student's diagram** ([rendered](https://www.plantuml.com/plantuml/png/${encodePlantUML(s.code)})):`, '', '```', s.code, '```', '', `**Student's question.** ${questions[q]}`, '', '**Reply X**', '', '> ' + X.message.replace(/\n/g, '\n> '), '', '**Reply Y**', '', '> ' + Y.message.replace(/\n/g, '\n> '), '');
    key.push([pairNo, seedId, q, X.tutor, Y.tutor]);
  }
}
writeFileSync(path.join(dir, 'e2-pairs.md'), md.join('\n') + '\n');
writeFileSync(path.join(dir, 'e2-key.csv'), csv(key));
console.log(lines.join('\n'));
console.log(`\nWrote summary.md, metrics.csv, coding-sheet.csv, coding-key.csv, e2-pairs.md (${pairNo} pairs), e2-key.csv in ${path.relative(process.cwd(), dir)}`);
