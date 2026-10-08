// Keep unsupported member syntax available instead of silently discarding it.
export function parseClassMembers(source) {
  const attributes = [], methods = [], extra = [];
  for (const line of source.split('\n')) {
    if (!line.trim()) continue;
    const method = line.match(/^\s*(\{(?:static|abstract)\}\s*)?([+\-#~])?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?::\s*(.*))?$/);
    const attribute = line.match(/^\s*(\{(?:static|abstract)\}\s*)?([+\-#~])?\s*([A-Za-z_$][\w$]*)\s*(?::\s*(.*))?$/);
    if (method) methods.push({ modifier: method[1]?.trim() || '', visibility: method[2] || '', name: method[3], parameters: method[4].trim(), type: (method[5] || '').trim() });
    else if (attribute) attributes.push({ modifier: attribute[1]?.trim() || '', visibility: attribute[2] || '', name: attribute[3], type: (attribute[4] || '').trim() });
    else extra.push(line);
  }
  return { attributes, methods, extra: extra.join('\n') };
}
export function serializeClassMembers({ attributes, methods, extra = '' }) {
  const lines = [];
  for (const [isMethod, members] of [[false, attributes], [true, methods]]) {
    for (const member of members) {
      const name = member.name.trim(), type = (member.type || '').trim(), parameters = (member.parameters || '').trim();
      if (!name && !type && !parameters) continue;
      if (!/^[A-Za-z_$][\w$]*$/.test(name) || /[\r\n{}@]/.test(type + parameters) || /[()]/.test(parameters) || !['+', '-', '#', '~', ''].includes(member.visibility) || !['', '{static}', '{abstract}'].includes(member.modifier || '')) throw new Error('invalidMember');
      lines.push((member.modifier ? member.modifier + ' ' : '') + member.visibility + name + (isMethod ? `(${parameters})` : '') + (type ? ' : ' + type : ''));
    }
  }
  if (/[{}@]/.test(extra.replace(/\{(?:static|abstract)\}/g, ''))) throw new Error('invalidMember');
  if (extra.trim()) lines.push(extra.trim());
  return lines.join('\n');
}
