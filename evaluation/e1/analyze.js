// E1 analysis. Usage: node analyze.js --model ID
// Reads results/en/replies-<model>.jsonl and rewrites, in results/en/:
//   metrics.csv   one row per reply: length, ends with a question, element names cited exactly, references
//   summary.md    the automatic rows of Table 1 and the reference counts reported in the paper
// The coded rows (issues, leakage levels) come from coding/ (see coding/agreement.py).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromRepo } from './repo.js';
import { getStudy } from './seeds.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const { resolveDiagramReference } = await fromRepo('lib.js');
const { parseElements } = await fromRepo('public/diagram-elements.js');
const { parseDiagramRelations } = await fromRepo('public/diagram-relations.js');
const { seeds, questions } = getStudy('en');
const dir = path.join(here, 'results', 'en');
const mi = process.argv.indexOf('--model');
const model = mi >= 0 ? process.argv[mi + 1] : 'gpt-5.4-mini-2026-03-17';
const seedById = Object.fromEntries(seeds.map(s => [s.id, s]));
const records = readFileSync(path.join(dir, `replies-${model}.jsonl`), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

// ---------- per-reply measures
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function citations(text, seed) {
  const names = [...new Set(parseElements(seed.diagramType, seed.code).flatMap(e => [e.name, e.id]))];
  return names.filter(n => new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(n)}(?![\\p{L}\\p{N}_])`, n.includes(' ') ? 'iu' : 'u').test(text));
}
for (const r of records) {
  const seed = seedById[r.seed], text = r.message || '';
  r.words = (text.match(/\S+/g) || []).length;
  r.cited = citations(text, seed);
  r.citations = r.cited.length;
  r.endsWithQuestion = /\?\s*$/.test(text.trim());
}

// ---------- statistics
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const TUTORS = ['modelau', 'baseline', 'baseline-nocorr'];
const LABEL = { modelau: 'ModelaU', baseline: 'Baseline', 'baseline-nocorr': 'No-corr.' };
const prompts = seeds.flatMap(s => Object.keys(questions).map(q => `${s.id}|${q}`));
const by = t => records.filter(r => r.tutor === t);
const perPrompt = (t, field) => prompts.map(p => { const [seed, q] = p.split('|'); return mean(by(t).filter(r => r.seed === seed && r.question === q).map(r => +r[field])); });
const fmt = (v, d = 1) => v.toFixed(d);

const lines = ['# E1 automatic measures', '', `Model: ${[...new Set(records.map(r => r.model))].join(', ')}. ${prompts.length} prompts x 3 runs per tutor.`, ''];
lines.push('## Table 1, automatic rows', '', `| Measure | ${TUTORS.map(t => LABEL[t]).join(' | ')} |`, '|---|---|---|---|');
lines.push(`| Words per reply (median over prompts of the mean over runs) | ${TUTORS.map(t => fmt(median(perPrompt(t, 'words')))).join(' | ')} |`);
lines.push(`| Replies ending with a question | ${TUTORS.map(t => `${by(t).filter(r => r.endsWithQuestion).length}/${by(t).length}`).join(' | ')} |`);
lines.push(`| Student's element names cited exactly (median over prompts) | ${TUTORS.map(t => fmt(median(perPrompt(t, 'citations')))).join(' | ')} |`);
const wm = perPrompt('modelau', 'words');
lines.push('', `ModelaU's replies were shorter than the baseline's on ${wm.filter((v, i) => v < perPrompt('baseline', 'words')[i]).length} of ${prompts.length} prompts and than the no-corrections baseline's on ${wm.filter((v, i) => v < perPrompt('baseline-nocorr', 'words')[i]).length}.`);

// ---------- ModelaU's references to the diagram, now and under the earlier exact-match rule
function references(tutor) {
  let proposed = 0, exactFail = 0, resolveFail = 0, replies = 0;
  for (const r of by(tutor)) {
    const seed = seedById[r.seed], elements = parseElements(seed.diagramType, seed.code), relations = parseDiagramRelations(seed.diagramType, seed.code, elements);
    let parsed; try { parsed = JSON.parse(r.raw.replace(/^\s*```(?:json)?\s*/, '').replace(/\s*```\s*$/, '')); } catch { continue; }
    const exact = new Set(elements.flatMap(e => [e.id, e.name]));
    let n = 0;
    for (const d of Array.isArray(parsed.diagramHighlights) ? parsed.diagramHighlights : []) {
      if (!d || typeof d.reason !== 'string' || !d.reason.trim()) continue;
      proposed++; n++;
      if (!exact.has(d.element)) exactFail++;
      if (!resolveDiagramReference(d.element, elements, relations).length) resolveFail++;
    }
    if (n > 0) replies++;
  }
  return { proposed, exactFail, resolveFail, replies, total: by(tutor).length };
}
lines.push('', '## References to the diagram elements', '', '| Version | Replies pointing at an element | References proposed | Discarded by the earlier exact-match rule | Discarded by the current rule |', '|---|---|---|---|---|');
for (const [t, label] of [['modelau-v1', 'ModelaU before the design iteration'], ['modelau', 'ModelaU (reported version)']]) {
  const x = references(t);
  lines.push(`| ${label} | ${x.replies}/${x.total} | ${x.proposed} | ${x.exactFail} | ${x.resolveFail} |`);
}
const mo = by('modelau');
lines.push('', `Exercise excerpts proposed by ModelaU (shared highlight vocabulary): ${mo.reduce((x, r) => x + (r.highlightsRaw || 0), 0)}; discarded as not literally in the exercise text: ${mo.reduce((x, r) => x + (r.highlightsInvalid || []).length, 0)}.`);
writeFileSync(path.join(dir, 'summary.md'), lines.join('\n') + '\n');

// ---------- metrics.csv
const csv = rows => rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';
writeFileSync(path.join(dir, 'metrics.csv'), csv([
  ['key', 'seed', 'diagramType', 'question', 'run', 'tutor', 'words', 'endsWithQuestion', 'citations', 'cited', 'diagramHighlightsRaw', 'diagramHighlightsInvalid', 'highlightsRaw', 'highlightsInvalid', 'message'],
  ...records.map(r => [r.key, r.seed, r.diagramType, r.question, r.run, r.tutor, r.words, r.endsWithQuestion, r.citations, r.cited.join('; '), r.diagramHighlightsRaw ?? '', (r.diagramHighlightsInvalid || []).join('; '), r.highlightsRaw ?? '', (r.highlightsInvalid || []).join('; '), r.message]),
]));
console.log(lines.join('\n'));
