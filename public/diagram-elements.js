// Shared with the server so it can validate tutor citations against the
// student's own declared elements, not just the browser-side designer.
export function parseElements(type, source) {
  const lines = source.split('\n');
  const result = [];
  const kinds = type === 'class' ? 'abstract class|class|interface|enum' : type === 'usecase' ? 'actor|usecase' : 'participant|actor|boundary|control|entity|database|collections|queue';
  const re = new RegExp(`^\\s*(${kinds})\\s+(?:"([^"\\n]+)"\\s+as\\s+([A-Za-z_]\\w*)|([A-Za-z_]\\w*))(\\s*\\{)?\\s*$`);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    let end = i;
    if (m[5]) { end = lines.findIndex((line, j) => j > i && /^\s*}\s*$/.test(line)); if (end < 0) continue; }
    result.push({ kind: m[1], name: m[2] || m[4], id: m[3] || m[4], start: i, end, members: lines.slice(i + 1, end).join('\n').replace(/^  /gm, '') });
    i = end;
  }
  return result;
}
