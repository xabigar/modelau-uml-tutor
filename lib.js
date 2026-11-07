import { deflateRawSync } from 'node:zlib';
export const providers = {
  openai: { url: 'https://api.openai.com/v1/chat/completions' },
  anthropic: { url: 'https://api.anthropic.com/v1/messages' },
  gemini: { url: 'https://generativelanguage.googleapis.com/v1beta/models/' }
};
export function encodePlantUML(source) {
  const bytes = deflateRawSync(Buffer.from(source));
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
  let encoded = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b = 0, c = 0] = bytes.subarray(i, i + 3);
    encoded += alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)] + alphabet[((b & 15) << 2) | (c >> 6)] + alphabet[c & 63];
  }
  return encoded;
}
export function parseTutorReply(text, exercise, diagramElements = []) {
  let parsed;
  try { parsed = JSON.parse(text.replace(/^\s*```(?:json)?\s*/, '').replace(/\s*```\s*$/, '')); }
  catch { return { message: text, highlights: [], diagramHighlights: [] }; }
  if (typeof parsed.message !== 'string' || !parsed.message.trim()) throw new Error('El modelo no devolvió una respuesta válida.');
  const highlights = (Array.isArray(parsed.highlights) ? parsed.highlights : []).filter(h =>
    h && typeof h.quote === 'string' && h.quote.trim() && exercise.includes(h.quote) &&
    ['requirement', 'actor', 'ambiguity'].includes(h.category) && typeof h.reason === 'string'
  ).slice(0, 6);
  // Citations must name a real element from the student's own diagram — never
  // an invented one — so the server resolves each to its stable identifier.
  const byNameOrId = new Map(diagramElements.flatMap(e => [[e.id, e.id], [e.name, e.id]]));
  const diagramHighlights = (Array.isArray(parsed.diagramHighlights) ? parsed.diagramHighlights : [])
    .filter(d => d && typeof d.element === 'string' && typeof d.reason === 'string' && d.reason.trim())
    .map(d => ({ element: byNameOrId.get(d.element), reason: d.reason.trim() }))
    .filter(d => d.element)
    .slice(0, 3);
  return { message: parsed.message.slice(0, 24000), highlights, diagramHighlights };
}
export function extractProviderText(provider, result) {
  if (provider === 'anthropic') return result.content?.filter(c => c.type === 'text').map(c => c.text).join('');
  if (provider === 'gemini') return result.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
  return result.choices?.[0]?.message?.content;
}
export function parseExerciseReply(text) {
  let parsed;
  try { parsed = JSON.parse(text.replace(/^\s*```(?:json)?\s*/, '').replace(/\s*```\s*$/, '')); }
  catch { return { statement: text.trim().slice(0, 6000) }; }
  if (typeof parsed.statement !== 'string' || !parsed.statement.trim()) throw new Error('El modelo no devolvió un enunciado válido.');
  return { statement: parsed.statement.trim().slice(0, 6000) };
}
export function buildRequest(provider, model, key, system, messages, endpoint) {
  if (provider === 'compatible') {
    const url = new URL(endpoint);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('URL del endpoint no válida.');
    return { url: url.href.replace(/\/+$/, '') + '/chat/completions', headers: key ? { Authorization: `Bearer ${key}` } : {}, body: { model, messages: [{ role: 'system', content: system }, ...messages] } };
  }
  if (!providers[provider]) throw new Error('Proveedor no válido.');
  if (provider === 'anthropic') return { url: providers.anthropic.url, headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: { model, max_tokens: 1600, system, messages } };
  if (provider === 'gemini') return { url: providers.gemini.url + encodeURIComponent(model) + ':generateContent', headers: { 'x-goog-api-key': key }, body: { systemInstruction: { parts: [{ text: system }] }, contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), generationConfig: { responseMimeType: 'application/json' } } };
  return { url: providers.openai.url, headers: { Authorization: `Bearer ${key}` }, body: { model, messages: [{ role: 'system', content: system }, ...messages], response_format: { type: 'json_object' } } };
}
