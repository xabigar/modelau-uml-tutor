// Approximate, structural detection of where a student's diagram sits in its
// own construction procedure. Purely informational: a student can legitimately
// start at any diagram type or skip ahead, so this never gates or blocks —
// it only steers UI copy and the tutor's context toward the relevant step.
import { parseClassMembers } from './class-members.js';
const multiplicityExempt = new Set(['--|>', '..|>', '..>']);
const STEPS = {
  class: [
    { id: 'classes', complete: elements => elements.length > 0 },
    { id: 'attributes', complete: elements => elements.some(e => e.members && e.members.trim()) },
    { id: 'associations', complete: (elements, relations) => relations.length > 0 },
    { id: 'multiplicities', complete: (elements, relations) => relations.length > 0 && relations.every(r => multiplicityExempt.has(r.arrow) || (r.m1.trim() && r.m2.trim())) },
    { id: 'methods', complete: elements => elements.some(e => parseClassMembers(e.members || '').methods.length > 0) },
    { id: 'review', complete: () => false }
  ],
  usecase: [
    { id: 'actors', complete: elements => elements.some(e => e.kind === 'actor') },
    { id: 'useCases', complete: elements => elements.some(e => e.kind === 'usecase') },
    { id: 'links', complete: (elements, relations) => relations.length > 0 },
    { id: 'review', complete: () => false }
  ],
  sequence: [
    { id: 'participants', complete: elements => elements.length > 0 },
    { id: 'messages', complete: (elements, relations) => relations.length > 0 },
    { id: 'allConnected', complete: (elements, relations) => { const connected = new Set(relations.flatMap(r => [r.from, r.to])); return elements.length > 0 && elements.every(e => connected.has(e.id)); } },
    { id: 'fragments', complete: (elements, relations, source) => /^\s*(alt|loop|opt)\b/m.test(source || '') },
    { id: 'review', complete: () => false }
  ]
};
export function stepList(type) { return (STEPS[type] || []).map(s => s.id); }
export function detectStep(type, elements, relations, source = '') {
  const steps = STEPS[type];
  if (!steps) return null;
  for (const step of steps) if (!step.complete(elements, relations, source)) return step.id;
  return steps[steps.length - 1].id;
}
