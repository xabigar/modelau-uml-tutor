// E1 analysis. Usage: node analyze.js [--lang en|dev] [--model ID] [--include-mock]
// Reads results/replies.jsonl and writes, in results/:
//   metrics.csv          one row per reply, automatic metrics
//   summary.md           ModelaU vs each baseline: medians over the 18 prompts, leakage flag, validation
//   coding-sheet.csv     blinded replies for two human coders (issues raised)
//   coding-key.csv       maps blinded codes back to tutor (keep away from coders)
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

const ALL_TUTORS = ['modelau', 'modelau-v1', 'baseline', 'baseline-strict', 'baseline-nocorr'];
const LABEL = { modelau: 'ModelaU', 'modelau-v1': 'ModelaU v1 (before the fix)', baseline: 'Baseline', 'baseline-strict': 'Strict baseline', 'baseline-nocorr': 'No-corrections baseline' };
const tutors = ALL_TUTORS.filter(t => records.some(r => r.tutor === t));
const baselines = tutors.filter(t => !t.startsWith('modelau'));
const prompts = seeds.flatMap(s => Object.keys(questions).map(q => `${s.id}|${q}`));
const perPrompt = (tutor, field) => prompts.map(p => { const [seed, q] = p.split('|'); const rs = records.filter(r => r.seed === seed && r.question === q && r.tutor === tutor); return rs.length ? mean(rs.map(r => +r[field])) : NaN; });
const complete = prompts.map((_, i) => tutors.every(t => !Number.isNaN(perPrompt(t, 'words')[i])));
const paired = (field, other = 'baseline') => ({ m: perPrompt('modelau', field).filter((_, i) => complete[i]), b: perPrompt(other, field).filter((_, i) => complete[i]) });
const fmt = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : 'n/a';
const pct = (rs, f) => rs.length ? `${(100 * rs.filter(f).length / rs.length).toFixed(0)}% (${rs.filter(f).length}/${rs.length})` : 'n/a';

// ---------- summary
const by = (tutor, extra = () => true) => records.filter(r => r.tutor === tutor && extra(r));
const lines = [];
lines.push(`# E1 technical comparison — summary`, '', `Model: ${[...new Set(records.map(r => r.model))].join(', ')} · replies: ${records.length} · tutors: ${tutors.map(t => LABEL[t]).join(', ')} · prompts with all tutors: ${complete.filter(Boolean).length}/${prompts.length}${includeMock ? ' · **MOCK DATA INCLUDED**' : ''}`, '');
lines.push('## ModelaU vs each baseline (mean over runs, median over the 18 prompts)', '', '| Metric | Baseline | ModelaU median | Baseline median |', '|---|---|---|---|');
for (const [label, field] of [['Words per reply', 'words'], ['Issues raised (automatic proxy)', 'issuesProxy'], ['Own-element names cited exactly', 'citations']]) {
  for (const b of baselines) {
    const { m, b: bv } = paired(field, b);
    lines.push(`| ${label} | ${LABEL[b]} | ${fmt(median(m))} | ${fmt(median(bv))} |`);
  }
}
lines.push('', "## Solution leakage (automatic pattern flag; the coded verdicts are in ../../coding/)", '', `| Question | ${tutors.map(t => LABEL[t]).join(' | ')} |`, `|---|${tutors.map(() => '---').join('|')}|`);
for (const q of Object.keys(questions)) lines.push(`| ${q} | ${tutors.map(t => pct(by(t, r => r.question === q), r => r.leak)).join(' | ')} |`);
lines.push(`| all | ${tutors.map(t => pct(by(t), r => r.leak)).join(' | ')} |`);
lines.push('', '## Reply ends with a question (check of ModelaU\'s prompted rule)', '', tutors.map(t => `${LABEL[t]} ${pct(by(t), r => r.endsWithQuestion)}`).join(' · '));
const m = by('modelau');
const invalidDiagram = m.flatMap(r => r.diagramHighlightsInvalid || []), invalidExercise = m.flatMap(r => r.highlightsInvalid || []);
lines.push('', '## What the deterministic validation caught (ModelaU only)', '',
  `- Diagram references proposed: ${m.reduce((s, r) => s + (r.diagramHighlightsRaw || 0), 0)}; discarded as non-existent: ${invalidDiagram.length}; replies with at least one discarded reference: ${pct(m, r => (r.diagramHighlightsInvalid || []).length > 0)}.`,
  `- Discarded diagram references: ${invalidDiagram.length ? [...new Set(invalidDiagram.map(String))].join(', ') : 'none'}.`,
  `- Exercise excerpts proposed: ${m.reduce((s, r) => s + (r.highlightsRaw || 0), 0)}; discarded as not literally in the text: ${invalidExercise.length}.`);
lines.push('', '## Per seed (pattern-flagged leakage across all runs and questions)', '', `| Seed | Defect | ${tutors.map(t => LABEL[t]).join(' | ')} |`, `|---|---|${tutors.map(() => '---').join('|')}|`);
for (const s of seeds) lines.push(`| ${s.id} | ${s.defect} | ${tutors.map(t => pct(by(t, r => r.seed === s.id), r => r.leak)).join(' | ')} |`);
lines.push('', '> "Issues raised" here is an automatic proxy (number of list items, minimum 1). The protocol requires two human coders using coding-sheet.csv; the reported counts and kappa are in coding/.', '> Leakage is pattern-based; confirm each positive and a sample of negatives manually.');
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
const shuffleCoding = mkShuffle(rng(20261109));

// ---------- blinded coding sheet
const coded = shuffleCoding(records).map((r, i) => ({ code: `R${String(i + 1).padStart(3, '0')}`, r }));
writeFileSync(path.join(dir, 'coding-sheet.csv'), csv([['code', 'seed', 'seeded_defect', 'question', 'reply', 'issues_coder1', 'issues_coder2', 'leak_coder1(leak/borderline/hint)', 'leak_coder2(leak/borderline/hint)', 'defect_addressed_coder1(0/1)', 'defect_addressed_coder2(0/1)', 'notes'], ...coded.map(({ code, r }) => [code, r.seed, seedById[r.seed].defect, questions[r.question], r.message, '', '', '', '', '', '', ''])]));
writeFileSync(path.join(dir, 'coding-key.csv'), csv([['code', 'key', 'tutor'], ...coded.map(({ code, r }) => [code, r.key, r.tutor])]));

console.log(lines.join('\n'));
console.log(`\nWrote summary.md, metrics.csv, coding-sheet.csv, coding-key.csv in ${path.relative(process.cwd(), dir)}`);
