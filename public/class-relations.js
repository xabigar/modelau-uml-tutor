const arrows = ['--|>', '..|>', '<|--', '<|..', '<-->', '-->', '<--', '*--', '--*', 'o--', '--o', '..>', '<..', '--'];
const pattern = /^\s*([A-Za-z_]\w*)\s*(?:"([^"\r\n]*)"\s*)?(--\|>|\.\.\|>|<\|--|<\|\.\.|<-->|-->|<--|\*--|--\*|o--|--o|\.\.>|<\.\.|--)\s*(?:"([^"\r\n]*)"\s*)?([A-Za-z_]\w*)(?:\s*:\s*(.*))?\s*$/;
const reversed = { '<|--':'--|>', '<|..':'..|>', '<--':'-->', '--*':'*--', '--o':'o--', '<..':'..>' };
export function parseClassRelations(source, classes = []) {
  const excluded = new Set(classes.flatMap(item => Array.from({length:item.end-item.start+1},(_,i)=>item.start+i)));
  return source.split('\n').flatMap((raw,start) => {
    if (excluded.has(start)) return [];
    const match = raw.match(pattern);
    if (!match) return [];
    let [, from, m1 = '', arrow, m2 = '', to, label = ''] = match;
    if (reversed[arrow]) { [from,to,m1,m2] = [to,from,m2,m1]; arrow = reversed[arrow]; }
    return [{ from, to, m1, m2, arrow, label:label.trim(), start, raw }];
  });
}
export function generateClassRelation({ from, to, m1 = '', m2 = '', arrow, label = '' }) {
  if (![from,to].every(id => /^[A-Za-z_]\w*$/.test(id)) || !arrows.includes(arrow) || /["\r\n]/.test(m1+m2) || /[\r\n]/.test(label)) throw new Error('Invalid relationship');
  return `${from}${m1?' "'+m1+'"':''} ${arrow}${m2?' "'+m2+'"':''} ${to}${label?' : '+label:''}`;
}
