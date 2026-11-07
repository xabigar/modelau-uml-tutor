import { buildRequest, parseTutorReply } from './lib.js';
import { readSSE, partialTutorMessage } from './public/chat-stream.js';

export function buildStreamingRequest(...args) {
  const request = buildRequest(...args);
  if (args[0] === 'gemini') request.url = request.url.replace(':generateContent', ':streamGenerateContent?alt=sse');
  else request.body.stream = true;
  return request;
}

export async function* streamTutorReply(provider, response, exercise, diagramElements = [], diagramRelations = []) {
  // Some compatible servers accept stream:true but return a regular JSON reply.
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    const result = await response.json();
    if (result.error) throw new Error('El proveedor no pudo completar la respuesta.');
    const text = provider === 'anthropic' ? result.content?.filter(c => c.type === 'text').map(c => c.text).join('') : provider === 'gemini' ? result.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') : result.choices?.[0]?.message?.content;
    if (!text) throw new Error('El proveedor no devolvió texto. Prueba otro modelo.');
    yield { type:'done', ...parseTutorReply(text,exercise,diagramElements,diagramRelations) }; return;
  }
  let source = '', shown = '', complete = false;
  for await (const data of readSSE(response.body)) {
    if (data === '[DONE]') { complete = true; break; }
    let event;
    try { event = JSON.parse(data); } catch { throw new Error('El proveedor devolvió un stream no válido.'); }
    if (event.error || event.type === 'error') throw new Error('El proveedor interrumpió la respuesta. Comprueba la cuota y reintenta.');
    let delta = '';
    if (provider === 'anthropic') {
      if (event.type === 'content_block_start' && event.content_block?.type === 'text') delta = event.content_block.text || '';
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') delta = event.delta.text || '';
      if (event.delta?.stop_reason === 'max_tokens') throw new Error('La respuesta superó el límite de longitud. Reintenta con una pregunta más breve.');
      if (event.type === 'message_stop') complete = true;
    } else if (provider === 'gemini') {
      const candidate = event.candidates?.[0];
      delta = candidate?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
      if (event.promptFeedback?.blockReason || candidate?.finishReason && candidate.finishReason !== 'STOP') throw new Error('El proveedor no pudo completar la respuesta. Prueba a reformular la pregunta.');
      if (candidate?.finishReason === 'STOP') complete = true;
    } else {
      const choice = event.choices?.[0];
      if (choice?.finish_reason && choice.finish_reason !== 'stop') throw new Error('El proveedor no pudo completar la respuesta. Prueba a reformular la pregunta.');
      if (choice?.finish_reason === 'stop') complete = true;
      delta = choice?.delta?.content || '';
    }
    if (typeof delta !== 'string') throw new Error('El proveedor devolvió texto no válido.');
    source += delta;
    if (source.length > 120000) throw new Error('La respuesta es demasiado larga.');
    const message = partialTutorMessage(source);
    if (message && message !== shown) { shown = message; yield { type:'delta', text:message }; }
  }
  if (!complete) throw new Error('La conexión se interrumpió antes de terminar. Reintenta el mensaje.');
  if (!source.trim()) throw new Error('El proveedor no devolvió texto. Prueba otro modelo.');
  yield { type:'done', ...parseTutorReply(source,exercise,diagramElements,diagramRelations) };
}
