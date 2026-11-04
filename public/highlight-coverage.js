// Deterministic cross-reference: which exercise highlights the tutor already
// called out (any category — not just actors) still have no counterpart in
// the student's current diagram, whether that's a class/actor/use
// case/participant name or a relationship/message label.
function normalize(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
export function uncoveredHighlights(highlights, elements, relations) {
  const terms = [...elements.flatMap(e => [e.name, e.id]), ...relations.map(r => r.label)]
    .filter(Boolean).map(normalize).filter(Boolean);
  return highlights.filter(h => {
    const quote = normalize(h.quote);
    return !quote || !terms.some(term => quote.includes(term) || term.includes(quote));
  });
}
