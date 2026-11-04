// Deterministic, same-diagram structural checks — cheap enough to run on every
// edit, so the LLM is reserved for conceptual questions, not syntax-level gaps.
const multiplicityExempt = new Set(['--|>', '..|>', '..>']);
export function checkDiagram(type, elements, relations) {
  const issues = [];
  if (type === 'class') {
    for (const r of relations) {
      if (!multiplicityExempt.has(r.arrow) && !r.m1.trim() && !r.m2.trim()) issues.push({ target: 'relation', start: r.start, code: 'noMultiplicity' });
    }
  } else if (type === 'usecase') {
    const connected = new Set(relations.flatMap(r => [r.from, r.to]));
    for (const item of elements) {
      if (connected.has(item.id)) continue;
      issues.push({ target: 'element', id: item.id, code: item.kind === 'actor' ? 'isolatedActor' : 'isolatedUseCase' });
    }
  } else if (type === 'sequence') {
    const connected = new Set(relations.flatMap(r => [r.from, r.to]));
    for (const item of elements) if (!connected.has(item.id)) issues.push({ target: 'element', id: item.id, code: 'isolatedParticipant' });
  }
  return issues;
}
