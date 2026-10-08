// SSE boundaries need not match network chunks. Shared by Node and the browser.
export async function* readSSE(body) {
  if (!body) throw new Error('No se recibió una respuesta.');
  const reader = body.getReader(), decoder = new TextDecoder();
  let buffer = '', data = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream:true });
      if (buffer.length > 1_000_000) throw new Error('Respuesta demasiado grande.');
      let end;
      while ((end = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0,end).replace(/\r$/, '');
        buffer = buffer.slice(end + 1);
        if (!line) {
          if (data.length) { yield data.join('\n'); data = []; }
        } else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /,''));
      }
      if (done) {
        if (buffer.startsWith('data:')) data.push(buffer.slice(5).replace(/^ /,''));
        if (data.length) yield data.join('\n');
        break;
      }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

// Only reveal the top-level message, never the JSON envelope or highlight data.
export function partialTutorMessage(source) {
  const text = source.replace(/^\s*```(?:json)?\s*/, '').trimStart();
  if (!text.startsWith('{')) return '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' || text[i] === '[') depth++;
    else if (text[i] === '}' || text[i] === ']') depth--;
    else if (text[i] === '"') {
      const start = i++;
      while (i < text.length && text[i] !== '"') { if (text[i] === '\\') i++; i++; }
      if (i >= text.length) return '';
      if (depth !== 1 || text.slice(start,i+1) !== '"message"') continue;
      const match = /^\s*:\s*"/.exec(text.slice(i+1));
      if (!match) continue;
      const valueStart = i+1+match[0].length;
      let end = valueStart;
      while (end < text.length && text[end] !== '"') {
        if (text[end] === '\\') {
          if (end+1 >= text.length) break;
          if (text[end+1] === 'u') {
            if (!/^[\da-fA-F]{4}$/.test(text.slice(end+2,end+6))) break;
            end += 6; continue;
          }
          end += 2; continue;
        }
        end++;
      }
      try { return JSON.parse('"' + text.slice(valueStart,end) + '"').replace(/[\uD800-\uDBFF]$/, '').slice(0,24000); }
      catch { return ''; }
    }
  }
  return '';
}
